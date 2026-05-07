const CORRECT_PIN = "1234";
const TOPICS = ["KOC", "KXC", "KTC"];
const RANGE_SIZE = 100;
const STORAGE_KEY = 'exam_progress';

let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let questionStates = [];

// 🗄 Логика сохранения прогресса
function getStorage() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
function saveStorage(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function getTopicProgress(topic) {
  const storage = getStorage();
  let total = 0, correct = 0, wrong = 0;
  for (let key in storage) {
    if (key.startsWith(topic + '_')) {
      const p = storage[key];
      total += (p.index || 0);
      correct += (p.correct || 0);
      wrong += (p.wrong || 0);
    }
  }
  return { total, correct, wrong };
}

function saveCurrentProgress() {
  const storage = getStorage();
  const key = `${currentQuestions.topic}_${currentQuestions.start}_${currentQuestions.end}`;
  storage[key] = { index: currentIndex, correct: correctCount, wrong: wrongCount };
  saveStorage(storage);
}

function resetAllProgress() {
  if (confirm('⚠️ Вы уверены, что хотите сбросить ВЕСЬ прогресс по всем темам? Это действие нельзя отменить.')) {
    localStorage.removeItem(STORAGE_KEY);
    showTopicSelector();
  }
}

// 🔀 Перемешивание массива
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 📱 PIN Логика
const pinInput = document.getElementById('pin-input');
const keypad = document.querySelector('.pin-keypad');
const liveStatsEl = document.getElementById('live-stats');

keypad.addEventListener('click', (e) => {
  if (e.target.classList.contains('key-btn')) {
    const num = e.target.dataset.num;
    if (num === 'back') {
      pinInput.value = pinInput.value.slice(0, -1);
      document.getElementById('pin-error').textContent = '';
    } else {
      if (pinInput.value.length < 4) {
        pinInput.value += num;
        document.getElementById('pin-error').textContent = '';
        if (pinInput.value.length === 4) checkPin();
      }
    }
  }
});

function checkPin() {
  if (pinInput.value === CORRECT_PIN) {
    document.getElementById('pin-overlay').style.display = 'none';
    loadQuestions();
  } else {
    document.getElementById('pin-error').textContent = 'Неверный PIN';
    pinInput.value = '';
    if (navigator.vibrate) navigator.vibrate(200);
  }
}

async function loadQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('Файл не найден');
    allQuestions = await res.json();
    showTopicSelector();
  } catch (err) {
    document.getElementById('pin-error').textContent = '❌ Ошибка загрузки questions.json';
  }
}

function hideAllScreens() {
  ['topic-select', 'range-select', 'quiz-header', 'quiz-main', 'quiz-footer', 'results-screen']
    .forEach(id => document.getElementById(id).classList.add('hidden'));
}

function showTopicSelector() {
  const container = document.getElementById('topics-container');
  container.innerHTML = '';
  
  TOPICS.forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'topic-btn';
    const total = allQuestions.filter(q => q.topic === topic).length;
    const prog = getTopicProgress(topic);
    
    // Формируем текст с прогрессом
    let progressText = prog.total > 0 ? ` | Решено: ${prog.total}/${total}` : '';
    btn.textContent = `${topic} (${total} вопр.${progressText})`;
    btn.onclick = () => showRangeSelector(topic);
    container.appendChild(btn);
  });

  // Кнопка сброса прогресса
  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-progress-btn';
  resetBtn.className = 'topic-btn';
  resetBtn.style.marginTop = '20px';
  resetBtn.style.background = 'var(--wrong)';
  resetBtn.style.borderColor = 'var(--wrong)';
  resetBtn.style.color = '#fff';
  resetBtn.textContent = '🗑 Сбросить весь прогресс';
  resetBtn.onclick = resetAllProgress;
  container.appendChild(resetBtn);

  hideAllScreens();
  document.getElementById('topic-select').classList.remove('hidden');
}

function showRangeSelector(topic) {
  const filtered = allQuestions.filter(q => q.topic === topic);
  const container = document.getElementById('ranges-container');
  document.getElementById('range-title').textContent = topic;
  container.innerHTML = '';

  for (let i = 0; i < filtered.length; i += RANGE_SIZE) {
    const start = i + 1;
    const end = Math.min(i + RANGE_SIZE, filtered.length);
    const btn = document.createElement('button');
    btn.className = 'range-btn';
    
    // Проверяем сохраненный прогресс для этой пачки
    const storage = getStorage();
    const key = `${topic}_${start}_${end}`;
    const saved = storage[key] || { index: 0, correct: 0, wrong: 0 };
    
    let suffix = '';
    if (saved.index > 0) {
      suffix = ` (Решено: ${saved.index}/${end - i})`;
    }
    
    btn.textContent = `Вопросы ${start}-${end}${suffix}`;
    btn.onclick = () => startQuiz(topic, start, end, filtered.slice(i, end), saved);
    container.appendChild(btn);
  }

  hideAllScreens();
  document.getElementById('range-select').classList.remove('hidden');
}

document.getElementById('back-to-topics-from-range').onclick = showTopicSelector;

function startQuiz(topic, start, end, questionsChunk, savedData) {
  currentQuestions = questionsChunk;
  currentQuestions.topic = topic;
  currentQuestions.start = start;
  currentQuestions.end = end;
  
  // Загружаем сохраненное состояние или начинаем с нуля
  currentIndex = savedData.index || 0;
  correctCount = savedData.correct || 0;
  wrongCount = savedData.wrong || 0;
  questionStates = new Array(currentQuestions.length).fill(null).map(() => ({ answered: false, selected: -1 }));

  // Перемешиваем варианты ответов (сохраняем привязку к правильному ответу)
  currentQuestions = currentQuestions.map(q => {
    let opts = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
    opts = shuffleArray(opts);
    return {
      question: q.question,
      options: opts.map(o => o.text),
      correct: opts.findIndex(o => o.isCorrect)
    };
  });

  updateLiveStats();
  hideAllScreens();
  document.getElementById('quiz-header').classList.remove('hidden');
  document.getElementById('quiz-main').classList.remove('hidden');
  document.getElementById('quiz-footer').classList.remove('hidden');
  
  showQuestion();
}

function showQuestion() {
  const q = currentQuestions[currentIndex];
  document.getElementById('question').textContent = q.question;
  document.getElementById('counter').textContent = `${currentIndex + 1} / ${currentQuestions.length}`;
  document.getElementById('feedback').textContent = '';

  const optionsEl = document.getElementById('options');
  optionsEl.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(i, q.correct, btn);
    optionsEl.appendChild(btn);
  });

  const state = questionStates[currentIndex];
  if (state.answered) {
    const btns = optionsEl.querySelectorAll('.opt-btn');
    btns.forEach(b => b.classList.add('disabled'));
    btns[q.correct].classList.add('correct');
    if (state.selected !== q.correct) {
      btns[state.selected].classList.add('wrong');
      document.getElementById('feedback').textContent = '❌ Было неверно';
      document.getElementById('feedback').style.color = 'var(--wrong)';
    } else {
      document.getElementById('feedback').textContent = '✅ Верно';
      document.getElementById('feedback').style.color = 'var(--correct)';
    }
  }

  document.getElementById('prev-btn').disabled = currentIndex === 0;
  const nextBtn = document.getElementById('next-btn');
  nextBtn.textContent = currentIndex === currentQuestions.length - 1 ? 'Завершить' : 'Далее →';
  nextBtn.disabled = false;
}

function checkAnswer(selected, correct, clickedBtn) {
  const state = questionStates[currentIndex];
  if (state.answered) return;
  
  state.answered = true;
  state.selected = selected;
  
  const btns = document.querySelectorAll('.opt-btn');
  btns.forEach(b => b.classList.add('disabled'));
  
  if (selected === correct) {
    clickedBtn.classList.add('correct');
    correctCount++;
    document.getElementById('feedback').textContent = '✅ Верно';
    document.getElementById('feedback').style.color = 'var(--correct)';
  } else {
    clickedBtn.classList.add('wrong');
    btns[correct].classList.add('correct');
    wrongCount++;
    document.getElementById('feedback').textContent = '❌ Неверно';
    document.getElementById('feedback').style.color = 'var(--wrong)';
  }
  
  updateLiveStats();
  saveCurrentProgress(); // 💾 Автосохранение после каждого ответа
}

function updateLiveStats() {
  liveStatsEl.textContent = `✅ ${correctCount} | ❌ ${wrongCount}`;
}

document.getElementById('next-btn').onclick = () => {
  saveCurrentProgress(); // 💾 Сохраняем позицию при переходе
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    showQuestion();
  } else {
    showResults();
  }
};

document.getElementById('prev-btn').onclick = () => {
  saveCurrentProgress();
  if (currentIndex > 0) { currentIndex--; showQuestion(); }
};

document.getElementById('back-to-topics-header-btn').onclick = () => {
  if (confirm('Вернуться к выбору тем? Прогресс сохранён.')) {
    showTopicSelector();
  }
};

function showResults() {
  hideAllScreens();
  document.getElementById('results-screen').classList.remove('hidden');
  document.getElementById('res-correct').textContent = correctCount;
  document.getElementById('res-wrong').textContent = wrongCount;
  document.getElementById('res-total').textContent = currentQuestions.length;
}

document.getElementById('back-to-topics-btn').onclick = () => {
  showTopicSelector();
};

window.addEventListener('DOMContentLoaded', () => pinInput.focus());