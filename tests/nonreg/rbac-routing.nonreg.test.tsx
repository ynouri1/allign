import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

type AuthMock = {
  user: { id: string } | null;
  loading: boolean;
  isAdmin: boolean;
  isPractitioner: boolean;
  isPatient: boolean;
};

function mountScenario(authState: AuthMock, allowedRoles: Array<"admin" | "practitioner" | "patient">) {
  mockedUseAuth.mockReturnValue(authState as ReturnType<typeof useAuth>);

  render(
    <MemoryRouter initialEntries={["/target"]}>
      <Routes>
        <Route
          path="/target"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Allowed Page</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/patient" element={<div>Patient Home</div>} />
        <Route path="/practitioner-new" element={<div>Practitioner Home</div>} />
        <Route path="/" element={<div>Landing Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RBAC routing (nonreg)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps patient on allowed patient route", () => {
    mountScenario(
      {
        user: { id: "patient" },
        loading: false,
        isAdmin: false,
        isPractitioner: false,
        isPatient: true,
      },
      ["patient"]
    );

    expect(screen.getByText("Allowed Page")).toBeInTheDocument();
  });

  it("redirects patient away from practitioner-only route", () => {
    mountScenario(
      {
        user: { id: "patient" },
        loading: false,
        isAdmin: false,
        isPractitioner: false,
        isPatient: true,
      },
      ["practitioner"]
    );

    expect(screen.getByText("Patient Home")).toBeInTheDocument();
  });

  it("redirects admin to landing page when admin role is not allowed", () => {
    mountScenario(
      {
        user: { id: "admin" },
        loading: false,
        isAdmin: true,
        isPractitioner: false,
        isPatient: false,
      },
      ["practitioner"]
    );

    expect(screen.getByText("Landing Page")).toBeInTheDocument();
  });

  it("allows admin when admin is part of allowed roles", () => {
    mountScenario(
      {
        user: { id: "admin" },
        loading: false,
        isAdmin: true,
        isPractitioner: false,
        isPatient: false,
      },
      ["practitioner", "admin"]
    );

    expect(screen.getByText("Allowed Page")).toBeInTheDocument();
  });
});
