import { usePuterStore } from "~/lib/puter";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

export const meta = () => [
  { title: "Resumind | Auth" },
  { name: "description", content: "Log into your account" },
];

const Auth = () => {
  const { isLoading, auth, error, clearError } = usePuterStore();
  const location = useLocation();
  const next = location.search.split("next=")[1];
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) navigate(next || "/");
  }, [auth.isAuthenticated, next]);

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover min-h-screen flex items-center justify-center">
      <div className="gradient-border shadow-lg">
        <section className="flex flex-col gap-8 bg-white rounded-2xl p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome</h1>
            <h2>Log In to Continue Your Job Journey</h2>
          </div>
          <div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Sign-in error:</strong>
                    <div className="text-sm">{error}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="px-3 py-1 bg-red-100 rounded"
                      onClick={() => {
                        clearError();
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                      onClick={() => {
                        clearError();
                        auth.signIn();
                      }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isLoading ? (
              <button className="auth-button animate-pulse">
                <p>Signing you in...</p>
              </button>
            ) : (
              <>
                {auth.isAuthenticated ? (
                  <button className="auth-button" onClick={auth.signOut}>
                    <p>Log Out</p>
                  </button>
                ) : (
                  <button className="auth-button" onClick={auth.signIn}>
                    <p>Log In</p>
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;
