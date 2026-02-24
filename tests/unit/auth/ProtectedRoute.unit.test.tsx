import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

type MockAuthState = {
  user: { id: string } | null;
  loading: boolean;
  isAdmin: boolean;
  isPractitioner: boolean;
  isPatient: boolean;
};

const mockedUseAuth = vi.mocked(useAuth);

function renderRoute(authState: MockAuthState, allowedRoles: Array<"admin" | "practitioner" | "patient">) {
  mockedUseAuth.mockReturnValue(authState as ReturnType<typeof useAuth>);

  render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route path="/patient" element={<div>Patient Dashboard</div>} />
        <Route path="/practitioner-new" element={<div>Practitioner Dashboard</div>} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loader while auth state is loading", () => {
    renderRoute(
      {
        user: null,
        loading: true,
        isAdmin: false,
        isPractitioner: false,
        isPatient: false,
      },
      ["patient"]
    );

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", () => {
    renderRoute(
      {
        user: null,
        loading: false,
        isAdmin: false,
        isPractitioner: false,
        isPatient: false,
      },
      ["patient"]
    );

    expect(screen.getByText("Auth Page")).toBeInTheDocument();
  });

  it("renders children for authorized role", () => {
    renderRoute(
      {
        user: { id: "user-1" },
        loading: false,
        isAdmin: false,
        isPractitioner: false,
        isPatient: true,
      },
      ["patient"]
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects practitioner to /practitioner-new when patient route is denied", () => {
    renderRoute(
      {
        user: { id: "user-2" },
        loading: false,
        isAdmin: false,
        isPractitioner: true,
        isPatient: false,
      },
      ["patient"]
    );

    expect(screen.getByText("Practitioner Dashboard")).toBeInTheDocument();
  });
});
