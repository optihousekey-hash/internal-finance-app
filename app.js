// Скрипт для локального обліку доходів та витрат без авторизації.
// Дані зберігаються у localStorage, а ідентифікація здійснюється через поле "Хто заповнив".

// Отримання DOM‑елементів
const dateEl = document.getElementById('date');
const personEl = document.getElementById('person');
const typeEl = document.getElementById('type');
const categoryEl = document.getElementById('category');
const amountEl = document.getElementById('amount');
const commentEl = document.getElementById('comment');
const addBtn = document.getElementById('addBtn');

const monthFilterEl = document.getElementById('monthFilter');

const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const totalBalanceEl = document.getElementById('totalBalance');

const monthIncomeEl = document.getElementById('monthIncome');
const monthExpenseEl = document.getElementById('monthExpense');
const monthBalanceEl = document.getElementById('monthBalance');

const transactionsBody = document.getElementById('transactionsBody');

// Ініціалізація дати та місяця за замовчуванням
const today = new Date();
dateEl.value = today.toISOString().split('T')[0];
monthFilterEl.value = today.toISOString().slice(0, 7);

// Подія додавання нової операції
addBtn.addEventListener('click', () => {
  const date = dateEl.value;
  const person = personEl.value.trim();
  const type = typeEl.value;
  const category = categoryEl.value.trim();
  const amount = parseFloat(amountEl.value);
  const comment = commentEl.value.trim();

  if (!date || !person || !category || isNaN(amount)) {
    alert('Будь ласка, заповніть дату, імʼя, категорію та суму.');
    return;
  }

  const id = Date.now().toString();
  const transaction = { id, date, person, type, category, amount, comment };

  const list = getTransactions();
  list.push(transaction);
  saveTransactions(list);

  clearForm();
  render();
});

// Подія зміни місяця для фільтрування
monthFilterEl.addEventListener('change', render);

// Завантаження операцій з localStorage
function getTransactions() {
  try {
    return JSON.parse(localStorage.getItem('transactions') || '[]');
  } catch (e) {
    console.error('Помилка читання даних:', e);
    return [];
  }
}

// Збереження операцій у localStorage
function saveTransactions(list) {
  localStorage.setItem('transactions', JSON.stringify(list));
}

// Очищення полів форми після додавання
function clearForm() {
  // Залишаємо дату незмінною
  personEl.value = '';
  categoryEl.value = '';
  amountEl.value = '';
  commentEl.value = '';
}

// Відображення таблиці та підсумків
function render() {
  const list = getTransactions();
  // Підсумок за весь період
  const totals = computeTotals(list);
  totalIncomeEl.textContent = totals.income.toFixed(2);
  totalExpenseEl.textContent = totals.expense.toFixed(2);
  totalBalanceEl.textContent = (totals.income - totals.expense).toFixed(2);

  // Підсумок за вибраний місяць
  const month = monthFilterEl.value;
  const monthList = list.filter(item => {
    // item.date у форматі YYYY-MM-DD
    return item.date.startsWith(month);
  });
  const monthTotals = computeTotals(monthList);
  monthIncomeEl.textContent = monthTotals.income.toFixed(2);
  monthExpenseEl.textContent = monthTotals.expense.toFixed(2);
  monthBalanceEl.textContent = (monthTotals.income - monthTotals.expense).toFixed(2);

  // Відображення таблиці
  renderTable(list);
}

// Підрахунок доходів і витрат
function computeTotals(items) {
  let income = 0;
  let expense = 0;
  for (const item of items) {
    if (item.type === 'income') {
      income += Number(item.amount);
    } else if (item.type === 'expense') {
      expense += Number(item.amount);
    }
  }
  return { income, expense };
}

// Побудова таблиці операцій
function renderTable(items) {
  // Очищуємо поточні рядки
  transactionsBody.innerHTML = '';
  // Сортуємо за датою у зворотному порядку для відображення останніх зверху
  const sorted = items.slice().sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });
  for (const item of sorted) {
    const tr = document.createElement('tr');
    // стовпці: дата, хто, тип, категорія, сума, коментар, дія
    tr.innerHTML = `
      <td>${item.date}</td>
      <td>${item.person}</td>
      <td>${item.type === 'income' ? 'Дохід' : 'Витрата'}</td>
      <td>${item.category}</td>
      <td>${Number(item.amount).toFixed(2)}</td>
      <td>${item.comment || ''}</td>
      <td><button class="delete-btn" data-id="${item.id}">Видалити</button></td>
    `;
    transactionsBody.appendChild(tr);
  }
  // Додаємо обробник для кнопок видалення
  const deleteButtons = transactionsBody.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteTransaction(id);
    });
  });
}

// Видалення операції за id
function deleteTransaction(id) {
  const list = getTransactions();
  const updated = list.filter(item => item.id !== id);
  saveTransactions(updated);
  render();
}

// Початкове завантаження
render();