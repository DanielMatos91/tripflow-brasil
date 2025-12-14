import { useAuth } from "@/contexts/AuthContext";

export function Unauthorized() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border bg-background p-6">
        <h1 className="text-xl font-semibold mb-2">Sem permissão</h1>
        <p className="text-muted-foreground mb-4">
          Sua conta não tem acesso a esta área. Fale com o administrador para liberar.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sair e fazer login novamente
          </button>
        </div>
      </div>
    </div>
  );
}
