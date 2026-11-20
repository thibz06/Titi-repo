import { missingPublicEnv } from "@/lib/env";

/** Au démarrage du serveur : dit clairement quelles variables manquent. */
export function register() {
  const missing = missingPublicEnv();
  if (missing.length > 0) {
    console.warn(
      `[Mauritius Quest] Variables d'environnement manquantes : ${missing.join(", ")}. ` +
        "L'app démarre, mais les écrans qui en dépendent afficheront un message à la place. Voir .env.example.",
    );
  }
}
