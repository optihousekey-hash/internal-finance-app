const dateEl = document.getElementById("date");
const personEl = document.getElementById("person");
const typeEl = document.getElementById("type");
const categoryEl = document.getElementById("category");
const amountEl = document.getElementById("amount");
const commentEl = document.getElementById("comment");
const addBtn = document.getElementById("addBtn");
const formMessageEl = document.getElementById("formMessage");

const dateFromEl = document.getElementById("dateFrom");
const dateToEl = document.getElementById("dateTo");
const categoryFilterEl = document.getElementById("categoryFilter");
const typeFilterEl = document.getElementById("typeFilter");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const reloadBtn = document.getElementById("reloadBtn");

const summaryIncomeEl = document.getElementById("summaryIncome");
const summaryExpenseEl = document.getElementById("summaryExpense");
const summaryBalanceEl = document.getElementById("summaryBalance");

const incomeListEl = document.getElementById("incomeList");
const expenseListEl = document.getElementById("expenseList");

const transactionsBody = document.getElementById("transactionsBody");

let allTransactions = [];

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function firstDayOfMonthString() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return first.toISOString().split("T")[0];
}

dateEl.value = todayString();
dateFromEl.value = firstDayOfMonthString();
dateToEl.value = todayString();

addBtn.addEventListener("click", addTransaction);
applyFiltersBtn.addEventListener("click", renderFilteredData);
resetFiltersBtn.addEventListener("click", resetFilters);
reloadBtn.addEventListener("click", loadTransactions);

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Помилка запиту");
  }

  return data;
}

async function loadTransactions() {
  try {
    formMessageEl.textContent = "Завантаження...";
    const data = await apiRequest("/api/transactions");
    allTransactions = Array.isArray(data.items) ? data.items : [];
    populateCategoryFilter(allTransactions);
    renderFilteredData();
    formMessageEl.textContent = "";
  } catch (error) {
    formMessageEl.textContent = error.message;
  }
}

async function addTransaction() {
  try {
    const payload = {
      date: dateEl.value,
      person: personEl.value.trim(),
      type: typeEl.value,
      category: categoryEl.value.trim(),
      amount: Number(amountEl.value),
      comment: commentEl.value.trim()
    };

    if (!payload.date || !payload.person || !payload.category || !payload.amount) {
      formMessageEl.textContent = "Заповніть дату, хто заповнив, категорію та суму.";
      return;
    }

    formMessageEl.textContent = "Збереження...";

    await apiRequest("/api/transactions", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    personEl.value = "";
    categoryEl.value = "";
    amountEl.value = "";
    commentEl.value = "";

    await loadTransactions();
    formMessageEl.textContent = "Операцію збережено.";
  } catch (error) {
    formMessageEl.textContent = error.message;
  }
}

async function deleteTransaction(id) {
  if (!confirm("Видалити цю операцію?")) return;

  try {
    await apiRequest("/api/transactions", {
      method: "DELETE",
      body: JSON.stringify({ id })
    });

    await loadTransactions();
  } catch (error) {
    formMessageEl.textContent = error.message;
  }
}

function populateCategoryFilter(items) {
  const current = categoryFilterEl.value;
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))].sort();

  categoryFilterEl.innerHTML = `<option value="">Усі категорії</option>`;

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilterEl.appendChild(option);
  });

  categoryFilterEl.value = categories.includes(current) ? current : "";
}

function filterTransactions(items) {
  const dateFrom = dateFromEl.value;
  const dateTo = dateToEl.value;
  const category = categoryFilterEl.value;
  const type = typeFilterEl.value;

  return items.filter((item) => {
    const okFrom = !dateFrom || item.date >= dateFrom;
    const okTo = !dateTo || item.date <= dateTo;
    const okCategory = !category || item.category === category;
    const okType = !type || item.type === type;

    return okFrom && okTo && okCategory && okType;
  });
}

function computeSummary(items) {
  let income = 0;
  let expense = 0;

  items.forEach((item) => {
    if (item.type === "income") income += Number(item.amount);
    if (item.type === "expense") expense += Number(item.amount);
  });

  return {
    income,
    expense,
    balance: income - expense
  };
}

function renderSummary(items) {
  const summary = computeSummary(items);

  summaryIncomeEl.textContent = summary.income.toFixed(2);
  summaryExpenseEl.textContent = summary.expense.toFixed(2);
  summaryBalanceEl.textContent = summary.balance.toFixed(2);

  const incomes = items
    .filter((item) => item.type === "income")
    .sort((a, b) => b.date.localeCompare(a.date));

  const expenses = items
    .filter((item) => item.type === "expense")
    .sort((a, b) => b.date.localeCompare(a.date));

  incomeListEl.innerHTML = incomes.length
    ? incomes
        .map(
          (item) => `
        <div class="mini-item">
          <span>${item.date} · ${item.category}</span>
          <strong>${Number(item.amount).toFixed(2)}</strong>
        </div>
      `
        )
        .join("")
    : `<div class="mini-item"><span>Немає доходів</span><strong>0.00</strong></div>`;

  expenseListEl.innerHTML = expenses.length
    ? expenses
        .map(
          (item) => `
        <div class="mini-item">
          <span>${item.date} · ${item.category}</span>
          <strong>${Number(item.amount).toFixed(2)}</strong>
        </div>
      `
        )
        .join("")
    : `<div class="mini-item"><span>Немає витрат</span><strong>0.00</strong></div>`;
}

function renderTable(items) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));

  transactionsBody.innerHTML = sorted.length
    ? sorted
        .map(
          (item) => `
        <tr>
          <td>${item.date}</td>
          <td>${item.person}</td>
          <td class="${item.type === "income" ? "type-income" : "type-expense"}">
            ${item.type === "income" ? "Дохід" : "Витрата"}
          </td>
          <td>${item.category}</td>
          <td>${Number(item.amount).toFixed(2)}</td>
          <td>${item.comment || ""}</td>
          <td>
            <button class="delete-btn" data-id="${item.id}">Видалити</button>
          </td>
        </tr>
      `
        )
        .join("")
    : `
      <tr>
        <td colspan="7">За цим фільтром записів немає.</td>
      </tr>
    `;

  transactionsBody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteTransaction(btn.dataset.id));
  });
}

function renderFilteredData() {
  const filtered = filterTransactions(allTransactions);
  renderSummary(filtered);
  renderTable(filtered);
}

function resetFilters() {
  dateFromEl.value = "";
  dateToEl.value = "";
  categoryFilterEl.value = "";
  typeFilterEl.value = "";
  renderFilteredData();
}

loadTransactions();
