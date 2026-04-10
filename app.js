// Налаштування Supabase
// Замініть ці значення на ваші власні Project URL та anon key з Supabase Dashboard
// Додайте адресу Project URL та Publishable (anon) API key, які надав користувач.
const SUPABASE_URL = "https://zryepygqtnzgbdkwupjh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeWVweXFxdG56Z2Jka3d1cGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTM2NzMsImV4cCI6MjA5MTMyOTY3M30.eTaJCTmg6godzczI1L38MM7B-jfXl4jC9AgTk3wnWsQ";

// Ініціалізація клієнта Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Елементи DOM
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authStatus = document.getElementById("authStatus");

const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const dateEl = document.getElementById("date");
const typeEl = document.getElementById("type");
const categoryEl = document.getElementById("category");
const amountEl = document.getElementById("amount");
const commentEl = document.getElementById("comment");
const addBtn = document.getElementById("addBtn");

const monthFilterEl = document.getElementById("monthFilter");
const refreshBtn = document.getElementById("refreshBtn");
const transactionsBody = document.getElementById("transactionsBody");

const incomeTotalEl = document.getElementById("incomeTotal");
const expenseTotalEl = document.getElementById("expenseTotal");
const balanceTotalEl = document.getElementById("balanceTotal");

// Встановлюємо поточну дату у форму
dateEl.value = new Date().toISOString().split("T")[0];
monthFilterEl.value = new Date().toISOString().slice(0, 7);

// Обробники подій
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
addBtn.addEventListener("click", addTransaction);
refreshBtn.addEventListener("click", loadTransactions);

// Функція входу
async function login() {
  const email = emailEl.value.trim();
  const password = passwordEl.value.trim();

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    authStatus.textContent = "Помилка входу: " + error.message;
    return;
  }

  authStatus.textContent = "Вхід успішний";
  await checkSession();
}

// Функція виходу
async function logout() {
  await supabaseClient.auth.signOut();
  await checkSession();
}

// Перевірка сесії та показ відповідних секцій
async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;
  if (session) {
    authSection.classList.remove("card");
    appSection.classList.remove("hidden");
    authStatus.textContent = "Авторизовано: " + session.user.email;
    await loadTransactions();
  } else {
    appSection.classList.add("hidden");
    authStatus.textContent = "Не авторизовано";
    transactionsBody.innerHTML = "";
    incomeTotalEl.textContent = "0";
    expenseTotalEl.textContent = "0";
    balanceTotalEl.textContent = "0";
  }
}

// Додавання транзакції
async function addTransaction() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    alert("Спочатку увійди в систему");
    return;
  }

  const payload = {
    date: dateEl.value,
    type: typeEl.value,
    category: categoryEl.value.trim(),
    amount: Number(amountEl.value),
    comment: commentEl.value.trim(),
    user_id: user.id,
  };

  const { error } = await supabaseClient.from("transactions").insert([payload]);
  if (error) {
    alert("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043d\u043d\u044f: " + error.message);
    return;
  }

  // Очищуємо поля після успішного додавання
  categoryEl.value = "";
  amountEl.value = "";
  commentEl.value = "";
  await loadTransactions();
}

// Завантаження транзакцій за обраний місяць
async function loadTransactions() {
  const month = monthFilterEl.value;
  const start = `${month}-01`;
  const endDate = new Date(`${month}-01`);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().split("T")[0];

  const { data, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false });

  if (error) {
    alert("\u041f\u043e\u043c\u0438\u043b\u043a\u0430 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u044f: " + error.message);
    return;
  }

  renderTransactions(data || []);
}

// Відображення списку транзакцій та підрахунок підсумків
function renderTransactions(items) {
  transactionsBody.innerHTML = "";
  let income = 0;
  let expense = 0;
  for (const item of items) {
    if (item.type === "income") income += Number(item.amount);
    if (item.type === "expense") expense += Number(item.amount);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.date}</td>
      <td>${item.type === "income" ? "\u0414\u043e\u0445\u0456\u0434" : "\u0412\u0438\u0442\u0440\u0430\u0442\u0430"}</td>
      <td>${item.category}</td>
      <td>${Number(item.amount).toFixed(2)}</td>
      <td>${item.comment || ""}</td>
    `;
    transactionsBody.appendChild(tr);
  }
  incomeTotalEl.textContent = income.toFixed(2);
  expenseTotalEl.textContent = expense.toFixed(2);
  balanceTotalEl.textContent = (income - expense).toFixed(2);
}

// Перевірити сесію при завантаженні сторінки
checkSession();
