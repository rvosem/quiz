let questions = [];
let currentIndex = 0;
let answered = false;

async function init() {
  document.getElementById('counter').textContent = 'Загрузка...';
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('Файл не найден');
    questions = await res.json();
    if (!Array.isArray(questions)) throw new Error('Неверный формат JSON');
    showQuestion();
  } catch (err) {
    document.getElementById('counter').textContent = '❌ Ошибка загрузки';
    document.getElementById('question').textContent = 'Проверьте файл questions.json и консоль браузера.';
  }
}

function showQuestion() {
  const q = questions[currentIndex];
  document.getElementById('question').textContent = q.question;
  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';
  answered = false;
  document.getElementById('feedback').textContent = '';
  document.getElementById('counter').textContent = `${currentIndex + 1} из ${questions.length}`;

  // Навигация
  document.getElementById('prev-btn').disabled = currentIndex === 0;
  const nextBtn = document.getElementById('next-btn');
  nextBtn.textContent = currentIndex === questions.length - 1 ? 'Начать сначала' : 'Далее →';
  nextBtn.disabled = false;

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = `${String.fromCharCode(65 + i)}) ${opt}`;
    btn.onclick = () => checkAnswer(i, q.correct, btn);
    optionsEl.appendChild(btn);
  });
}

function checkAnswer(selected, correct, clickedBtn) {
  if (answered) return;
  answered = true;
  const allBtns = document.querySelectorAll('.opt-btn');
  allBtns.forEach(b => b.classList.add('disabled'));

  const feedback = document.getElementById('feedback');
  if (selected === correct) {
    clickedBtn.classList.add('correct');
    feedback.textContent = '✅ Верно';
    feedback.style.color = '#14532d';
  } else {
    clickedBtn.classList.add('wrong');
    allBtns[correct].classList.add('correct');
    feedback.textContent = '❌ Неверно';
    feedback.style.color = '#7f1d1d';
  }
}

document.getElementById('next-btn').onclick = () => {
  currentIndex = currentIndex === questions.length - 1 ? 0 : currentIndex + 1;
  showQuestion();
};

document.getElementById('prev-btn').onclick = () => {
  if (currentIndex > 0) { currentIndex--; showQuestion(); }
};

init();