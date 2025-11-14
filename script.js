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

// Inicializar Firebase e Firestore
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
// Referência ao documento único que armazena o estado global
const muteRef = db.collection("state").doc("global");

// Elementos DOM
const countdownTimer = document.getElementById("countdownTimer");
const lastGuardian = document.getElementById("lastGuardian");
const currentPriceSpan = document.getElementById("currentPrice");
const dialUpSound = document.getElementById("dialUpSound");
const purchaseButton = document.getElementById("purchaseButton");

// Lógica de Formatação de Tempo
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}

// Variável para controlar a contagem JS
let countdownInterval;

// Lógica Principal: Ouvir em Tempo Real (Firebase Listener)
muteRef.onSnapshot(
  (doc) => {
    if (!doc.exists) {
      // Se o documento não existir, inicializa o estado
      db.collection("state").doc("global").set({
        timeRemaining: 0, // Começa desligado
        currentPrice: 100.0, // Preço inicial
        lastBuyer: null,
      });
      return;
    }

    const data = doc.data();
    const { timeRemaining, currentPrice, lastBuyer } = data;

    // 1. Atualizar informações de Status
    currentPriceSpan.textContent = currentPrice.toFixed(2).replace(".", ",");

    // 2. Lógica do Som e Contador
    if (timeRemaining > 0) {
      // SILÊNCIO ATIVO
      dialUpSound.pause();
      dialUpSound.currentTime = 0;
      lastGuardian.textContent = lastBuyer || "Ninguém (Erro de estado)";

      // Inicia/Reinicia a contagem regressiva visual no JS
      startLocalCountdown(timeRemaining);
    } else {
      // SOM ATIVO (RESET DIGITAL)
      // Usamos 'play().catch()' para evitar erros de autoplay do navegador
      dialUpSound.play().catch((e) => {
        lastGuardian.textContent = "Clique em qualquer lugar para ligar o som!";
      });
      countdownTimer.textContent = "00:00";
      lastGuardian.textContent = "Ninguém (O Som Está Ligado!)";
    }
  },
  (error) => {
    console.error("Erro fatal ao conectar ao Firestore:", error);
    lastGuardian.textContent = "ERRO: Falha na Conexão Firebase.";
  }
);

// 3. Contagem Regressiva Local (Visual)
function startLocalCountdown(initialTime) {
  clearInterval(countdownInterval);
  let timeLeft = initialTime;
  countdownTimer.textContent = formatTime(timeLeft);

  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      // O tempo local acabou, agora o listener aguarda a atualização do Firebase (pelo servidor)
      countdownTimer.textContent = "00:00";
    } else {
      countdownTimer.textContent = formatTime(timeLeft);
    }
  }, 1000);
}

// 4. Lógica do Botão (Simulação de Pagamento)
purchaseButton.addEventListener("click", () => {
  // ⚠️ ATENÇÃO: ESTE BOTÃO DEVE SER INTEGRADO COM UM SERVIÇO DE PAGAMENTO REAL (Stripe/Mercado Pago)
  // QUE, APÓS A CONFIRMAÇÃO, ENVIARÁ UM WEBHOOK PARA SUA CLOUD FUNCTION (BACKEND).

  const price = currentPriceSpan.textContent;
  alert(
    `Iniciando checkout de pagamento para R$ ${price}. A confirmação será enviada para o seu backend (Cloud Function) para atualizar o tempo.`
  );

  // Simulação manual de uma atualização do backend para TESTE:
  // **APENAS PARA TESTE MANUAL, REMOVA PARA PRODUÇÃO**
  // db.collection("state").doc("global").update({
  //     timeRemaining: 3600, // 60 minutos
  //     currentPrice: parseFloat(price.replace(',', '.')) + 50.00,
  //     lastBuyer: prompt("Seu nome de Guardião:") || "Guardião Anônimo"
  // });
});
