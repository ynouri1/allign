import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Auth from "@/pages/Auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

const toastErrorMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("Auth login/logout flow (nonreg)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in successfully and redirects to home", async () => {
    const signInMock = vi.fn().mockResolvedValue({ error: null });

    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      roles: [],
      loading: false,
      signIn: signInMock,
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      isAdmin: false,
      isPractitioner: false,
      isPatient: false,
    } as ReturnType<typeof useAuth>);

    const { container } = render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector("#email-signin") as HTMLInputElement, {
      target: { value: "admin.test@smile-tracker.local" },
    });
    fireEvent.change(container.querySelector("#password-signin") as HTMLInputElement, {
      target: { value: "AdminTest#2026" },
    });

    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("admin.test@smile-tracker.local", "AdminTest#2026");
      expect(screen.getByText("Home")).toBeInTheDocument();
    });
  });

  it("shows clear network error and exits loading state", async () => {
    const signInMock = vi.fn().mockResolvedValue({ error: new Error("Failed to fetch") });

    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      roles: [],
      loading: false,
      signIn: signInMock,
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      isAdmin: false,
      isPractitioner: false,
      isPatient: false,
    } as ReturnType<typeof useAuth>);

    const { container } = render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector("#email-signin") as HTMLInputElement, {
      target: { value: "admin.test@smile-tracker.local" },
    });
    fireEvent.change(container.querySelector("#password-signin") as HTMLInputElement, {
      target: { value: "AdminTest#2026" },
    });

    const submitButton = screen.getByRole("button", { name: /se connecter/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Erreur de connexion",
        expect.objectContaining({
          description: "Serveur Supabase inaccessible. Vérifie que Supabase local est démarré.",
        })
      );
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("redirects to auth route when user is logged out", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      roles: [],
      loading: false,
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      isAdmin: false,
      isPractitioner: false,
      isPatient: false,
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter initialEntries={["/patient"]}>
        <Routes>
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <div>Patient Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div>Auth Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Auth Page")).toBeInTheDocument();
  });
});
