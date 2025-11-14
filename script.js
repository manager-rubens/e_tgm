// ⚠️ PASSO CRÍTICO: Configuração do Firebase
// Você PRECISA criar um projeto no Firebase (Plano Spark é grátis)
// e substituir os valores abaixo pelos seus próprios.
const firebaseConfig = {
  apiKey: "AIzaSyBSOxUS6rRbGkLSjpOuEznBj6gOPRhqAFE",
  authDomain: "thegrandmute.firebaseapp.com",
  projectId: "thegrandmute",
  storageBucket: "thegrandmute.firebasestorage.app",
  messagingSenderId: "1039078360068",
  appId: "1:1039078360068:web:87f3b6771eaed297e6e151",
  measurementId: "G-F49WSFFVY8",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const muteRef = db.collection("state").doc("global");

// Elementos DOM Principais
const countdownTimer = document.getElementById("countdownTimer");
const lastGuardian = document.getElementById("lastGuardian");
const currentPriceSpan = document.getElementById("currentPrice");
const dialUpSound = document.getElementById("dialUpSound");
const purchaseButton = document.getElementById("purchaseButton");

// Elementos DOM Admin
const adminLoginArea = document.getElementById("adminLoginArea");
const adminActionArea = document.getElementById("adminActionArea");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const confirmMuteButton = document.getElementById("confirmMuteButton");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const loginMessage = document.getElementById("loginMessage");
const adminLastPrice = document.getElementById("adminLastPrice");
const buyerNameInput = document.getElementById("buyerName");

let countdownInterval;
let globalPrice = 100.0; // Estado inicial local

// =======================================================================
// (B) LÓGICA DE TEMPO E ESTADO
// =======================================================================

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

function startLocalCountdown(initialTime) {
  clearInterval(countdownInterval);
  let timeLeft = initialTime;
  countdownTimer.textContent = formatTime(timeLeft);

  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      // O tempo acabou. O listener do Firebase fará o som tocar
    } else {
      countdownTimer.textContent = formatTime(timeLeft);
    }
  }, 1000);
}

// Ouvir em Tempo Real (Firebase Listener)
muteRef.onSnapshot(
  (doc) => {
    if (!doc.exists) return; // Aguarda a criação manual do documento inicial

    const data = doc.data();
    const { timeRemaining, currentPrice, lastBuyer } = data;

    // 1. Atualizar Placar Global
    globalPrice = currentPrice;
    currentPriceSpan.textContent = currentPrice.toFixed(2).replace(".", ",");
    adminLastPrice.textContent = (currentPrice - 50.0)
      .toFixed(2)
      .replace(".", ","); // Preço do último comprador

    // 2. Lógica do Som
    if (timeRemaining > 0) {
      dialUpSound.pause();
      dialUpSound.currentTime = 0;
      lastGuardian.textContent = lastBuyer || "Guardião Anônimo";
      startLocalCountdown(timeRemaining);
    } else {
      // O som deve ser ativado
      dialUpSound.play().catch((e) => {
        // Mensagem para que o usuário interaja e o autoplay funcione
        lastGuardian.textContent = "Clique em qualquer lugar para ligar o som!";
      });
      countdownTimer.textContent = "00:00";
      lastGuardian.textContent = "Ninguém (O Som Está Ligado!)";
      clearInterval(countdownInterval);
    }
  },
  (error) => {
    console.error("Erro no Listener do Firestore:", error);
  }
);

// =======================================================================
// (C) LÓGICA DE LOGIN E ADMIN
// =======================================================================

// Mostrar/Ocultar painéis de administração
function toggleAdminView(isLoggedIn) {
  if (isLoggedIn) {
    adminLoginArea.classList.add("hidden");
    adminActionArea.classList.remove("hidden");
  } else {
    adminLoginArea.classList.remove("hidden");
    adminActionArea.classList.add("hidden");
    loginMessage.textContent = "";
  }
}

// Botão Entrar
loginButton.addEventListener("click", () => {
  const email = adminEmail.value;
  const password = adminPassword.value;

  if (!email || !password) {
    loginMessage.textContent = "Preencha email e senha.";
    return;
  }

  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      // Sucesso: o listener 'onAuthStateChanged' cuidará do resto
    })
    .catch((error) => {
      loginMessage.textContent = `Erro de Login: ${error.message}`;
    });
});

// Botão Sair
logoutButton.addEventListener("click", () => {
  auth.signOut();
});

// Listener de Autenticação do Firebase (Detecta login/logout)
auth.onAuthStateChanged((user) => {
  if (user) {
    // Usuário logado (Administrador)
    toggleAdminView(true);
    console.log("Admin logado com sucesso.");
  } else {
    // Usuário deslogado
    toggleAdminView(false);
  }
});

// =======================================================================
// (D) AÇÃO MANUAL DE ATUALIZAÇÃO DO ESTADO
// =======================================================================

confirmMuteButton.addEventListener("click", async () => {
  const buyerName = buyerNameInput.value.trim() || "Guardião Anônimo";
  const newPrice = globalPrice + 50.0;

  // Confirmação para evitar cliques acidentais
  const confirmation = confirm(
    `ATENÇÃO: Você está prestes a CONFIRMAR um pagamento e atualizar o estado para: Preço: R$ ${newPrice.toFixed(
      2
    )} | Guardião: ${buyerName}. Prossiga APENAS se o PIX/Transferência tiver sido CONFIRMADO.`
  );

  if (confirmation) {
    try {
      await muteRef.update({
        timeRemaining: 3600, // 60 minutos
        currentPrice: newPrice,
        lastBuyer: buyerName,
      });
      alert("Sucesso! Estado atualizado. O silêncio foi comprado.");
      buyerNameInput.value = ""; // Limpar campo
    } catch (e) {
      console.error("Erro ao atualizar o estado:", e);
      alert("ERRO ao gravar no Firestore. Verifique as regras de segurança.");
    }
  }
});

// 5. Lógica do Botão Comum de Compra (Alerta de Instrução)
purchaseButton.addEventListener("click", () => {
  const price = currentPriceSpan.textContent;
  alert(
    `Para comprar o silêncio por R$ ${price}, realize o PIX/Transferência para a chave [SUA CHAVE AQUI]. Seu nome aparecerá no placar assim que o Administrador confirmar o pagamento manual.`
  );
});
