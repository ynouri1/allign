import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAlignerAnalysis } from "@/hooks/useAlignerAnalysis";

const invokeMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("useAlignerAnalysis (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends data URL as imageBase64 and maps successful analysis response", async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: "analyzed",
        attachmentStatus: "ok",
        insertionQuality: "good",
        gingivalHealth: "healthy",
        overallScore: 92,
        recommendations: ["Continuer le port régulier"],
        analyzedAt: "2026-02-17T12:00:00.000Z",
      },
      error: null,
    });

    const { result } = renderHook(() => useAlignerAnalysis());

    let analysisResult: Awaited<ReturnType<typeof result.current.analyzePhoto>> = null;
    await act(async () => {
      analysisResult = await result.current.analyzePhoto("data:image/jpeg;base64,AAA", [11, 21]);
    });

    expect(invokeMock).toHaveBeenCalledWith("analyze-aligner-photo", {
      body: {
        imageBase64: "data:image/jpeg;base64,AAA",
        imageUrl: undefined,
        attachmentTeeth: [11, 21],
      },
    });

    expect(analysisResult).not.toBeNull();
    expect(analysisResult?.status).toBe("analyzed");
    expect(analysisResult?.overallScore).toBe(92);
    expect(analysisResult?.analyzedAt).toBeInstanceOf(Date);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("sends external URL as imageUrl", async () => {
    invokeMock.mockResolvedValue({
      data: {
        status: "analyzed",
        attachmentStatus: "partial",
        insertionQuality: "acceptable",
        gingivalHealth: "mild_inflammation",
        overallScore: 70,
        recommendations: [],
        analyzedAt: "2026-02-17T12:00:00.000Z",
      },
      error: null,
    });

    const { result } = renderHook(() => useAlignerAnalysis());

    await act(async () => {
      await result.current.analyzePhoto("https://example.com/photo.jpg", []);
    });

    expect(invokeMock).toHaveBeenCalledWith("analyze-aligner-photo", {
      body: {
        imageBase64: undefined,
        imageUrl: "https://example.com/photo.jpg",
        attachmentTeeth: [],
      },
    });
  });

  it("returns null and shows error toast when function invoke fails", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error("invoke failed"),
    });

    const { result } = renderHook(() => useAlignerAnalysis());

    let analysisResult: Awaited<ReturnType<typeof result.current.analyzePhoto>> = {
      status: "pending",
      attachmentStatus: "ok",
      insertionQuality: "good",
      gingivalHealth: "healthy",
      overallScore: 0,
      recommendations: [],
      analyzedAt: new Date(),
    };

    await act(async () => {
      analysisResult = await result.current.analyzePhoto("https://example.com/photo.jpg", []);
    });

    expect(analysisResult).toBeNull();
    expect(toastErrorMock).toHaveBeenCalledWith("Erreur lors de l'analyse de la photo");
  });

  it("returns null and surfaces API error message", async () => {
    invokeMock.mockResolvedValue({
      data: { error: "Crédits AI épuisés" },
      error: null,
    });

    const { result } = renderHook(() => useAlignerAnalysis());

    let analysisResult: Awaited<ReturnType<typeof result.current.analyzePhoto>> = {
      status: "pending",
      attachmentStatus: "ok",
      insertionQuality: "good",
      gingivalHealth: "healthy",
      overallScore: 0,
      recommendations: [],
      analyzedAt: new Date(),
    };

    await act(async () => {
      analysisResult = await result.current.analyzePhoto("https://example.com/photo.jpg", []);
    });

    expect(analysisResult).toBeNull();
    expect(toastErrorMock).toHaveBeenCalledWith("Crédits AI épuisés");
  });
});
