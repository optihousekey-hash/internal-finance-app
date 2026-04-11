const dateEl = document.getElementById("date");
const personEl = document.getElementById("person");
const operationTypeEl = document.getElementById("operationType");
const categoryEl = document.getElementById("category");
const amountEl = document.getElementById("amount");
const commentEl = document.getElementById("comment");
const addBtn = document.getElementById("addBtn");
const formMessageEl = document.getElementById("formMessage");

const incomeExpenseFieldsEl = document.getElementById("incomeExpenseFields");
const transferFieldsEl = document.getElementById("transferFields");

const balanceTargetEl = document.getElementById("balanceTarget");
const transferFromEl = document.getElementById("transferFrom");
const transferToEl = document.getElementById("transferTo");

const dateFromEl = document.getElementById("dateFrom");
const dateToEl = document.getElementById("dateTo");
const categoryFilterEl = document.getElementById("categoryFilter");
const typeFilterEl = document.getElementById("typeFilter");
const balanceFilterEl = document.getElementById("balanceFilter");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const reloadBtn = document.getElementById("reloadBtn");

const summaryIncomeEl = document.getElementById("summaryIncome");
const summaryExpenseEl = document.getElementById("summaryExpense");
const summaryBalanceEl = document.getElementById("summaryBalance");

const balanceOptihouseEl = document.getElementById("balanceOptihouse");
const balanceLiudaEl = document.getElementById("balanceLiuda");
const balanceKatyaEl = document.getElementById("balanceKatya");

const transactionsBody = document.getElementById("transactionsBody");

let allTransactions = [];

const BALANCE_LABELS = {
  optihouse: "ОптіХаус",
  liuda: "Люда",
  katya: "Катя"
};

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

operationTypeEl.addEventListener("change", toggleOperationFields);
addBtn.addEventListener("click", addTransaction);
applyFiltersBtn.addEventListener("click", renderFilteredData);
resetFiltersBtn.addEventListener("click", resetFilters);
reloadBtn.addEventListener("click", loadTransactions);

function toggleOperationFields() {
  const type = operationTypeEl.value;

  if (type === "transfer") {
    incomeExpenseFieldsEl.classList.add("hidden");
    transferFieldsEl.classList.remove("hidden");
  } else {
    incomeExpenseFieldsEl.classList.remove("hidden");
    transferFieldsEl.classList.add("hidden");
  }
}

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
    renderBalances(allTransactions);
    renderFilteredData();
    formMessageEl.textContent = "";
  } catch (error) {
    formMessageEl.textContent = error.message;
  }
}

async function addTransaction() {
  try {
    const operationType = operationTypeEl.value;
    const basePayload = {
      date: dateEl.value,
      person: personEl.value.trim(),
      type: operationType,
      category: categoryEl.value.trim(),
      amount: Number(amountEl.value),
      comment: commentEl.value.trim()
    };

    if (!basePayload.date || !basePayload.person || !basePayload.category || !basePayload.amount) {
      formMessageEl.textContent = "Заповніть дату, хто заповнив, категорію та суму.";
      return;
    }

    let payload = { ...basePayload };

    if (operationType === "income" || operationType === "expense") {
      payload.balanceTarget = balanceTargetEl.value;
    }

    if (operationType === "transfer") {
      const from = transferFromEl.value;
      const to = transferToEl.value;

      if (from === to) {
        formMessageEl.textContent = "Для переказу баланси мають бути різні.";
        return;
      }

      payload.transferFrom = from;
      payload.transferTo = to;
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

function calculateBalances(items) {
  const balances = {
    optihouse: 0,
    liuda: 0,
    katya: 0
  };

  items.forEach((item) => {
    if ((item.type === "income" || item.type === "expense") && item.balanceTarget) {
      if (item.type === "income") {
        balances[item.balanceTarget] += Number(item.amount);
      }
      if (item.type === "expense") {
        balances[item.balanceTarget] -= Number(item.amount);
      }
    }

    if (item.type === "transfer" && item.transferFrom && item.transferTo) {
      balances[item.transferFrom] -= Number(item.amount);
      balances[item.transferTo] += Number(item.amount);
    }
  });

  return balances;
}

function renderBalances(items) {
  const balances = calculateBalances(items);

  balanceOptihouseEl.textContent = balances.optihouse.toFixed(2);
  balanceLiudaEl.textContent = balances.liuda.toFixed(2);
  balanceKatyaEl.textContent = balances.katya.toFixed(2);
}

function filterTransactions(items) {
  const dateFrom = dateFromEl.value;
  const dateTo = dateToEl.value;
  const category = categoryFilterEl.value;
  const type = typeFilterEl.value;
  const balance = balanceFilterEl.value;

  return items.filter((item) => {
    const okFrom = !dateFrom || item.date >= dateFrom;
    const okTo = !dateTo || item.date <= dateTo;
    const okCategory = !category || item.category === category;
    const okType = !type || item.type === type;

    let okBalance = true;
    if (balance) {
      if (item.type === "transfer") {
        okBalance = item.transferFrom === balance || item.transferTo === balance;
      } else {
        okBalance = item.balanceTarget === balance;
      }
    }

    return okFrom && okTo && okCategory && okType && okBalance;
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
}

function getDirectionLabel(item) {
  if (item.type === "transfer") {
    return `${BALANCE_LABELS[item.transferFrom]} → ${BALANCE_LABELS[item.transferTo]}`;
  }

  return BALANCE_LABELS[item.balanceTarget] || "-";
}

function getTypeLabel(type) {
  if (type === "income") return "Дохід";
  if (type === "expense") return "Витрата";
  if (type === "transfer") return "Переказ";
  return type;
}

function getTypeClass(type) {
  if (type === "income") return "type-income";
  if (type === "expense") return "type-expense";
  if (type === "transfer") return "type-transfer";
  return "";
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
          <td class="${getTypeClass(item.type)}">${getTypeLabel(item.type)}</td>
          <td>${item.category}</td>
          <td>${getDirectionLabel(item)}</td>
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
        <td colspan="8">За цим фільтром записів немає.</td>
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
  balanceFilterEl.value = "";
  renderFilteredData();
}

toggleOperationFields();
loadTransactions();
