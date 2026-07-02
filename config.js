/* ============================================================
   PATRIMON — Configuração da nuvem (Firebase)
   ------------------------------------------------------------
   SEM esta configuração o sistema funciona em MODO LOCAL
   (salva só no aparelho, com exportar/importar backup).

   Para ativar o modo ONLINE (todos veem as alterações em tempo
   real), siga o passo a passo do LEIA-ME.md e cole aqui o bloco
   "firebaseConfig" gerado pelo Firebase. Exemplo:

  const firebaseConfig = {
  apiKey: "AIzaSyBAy3_BNYaitL1MxtykVUcDyIr1592VkiU",
  authDomain: "patrimon-da73f.firebaseapp.com",
  projectId: "patrimon-da73f",
  storageBucket: "patrimon-da73f.firebasestorage.app",
  messagingSenderId: "986820316093",
  appId: "1:986820316093:web:bd188eab264f657a39e0d4"
};

   (Essas chaves identificam o projeto e NÃO são um segredo —
   a proteção real são as regras de segurança do Firestore,
   incluídas no LEIA-ME.)
   ============================================================ */
window.PATRIMON_CONFIG = null;
