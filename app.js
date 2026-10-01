(() => {
  const TESTS = window.TESTS || [
    { id: "main", name: "Основной тест", description: "Тест из файла PA_ses_delo.docx", data: window.TEST_DATA || [] }
  ];
  let DATA = TESTS[0].data;
  const $ = (id) => document.getElementById(id);

  let questions = [];
  let index = 0;
  let mode = "exam";
  let answers = [];
  let checked = false;

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));

  const testSelect = $("testSelect");
  const testDescription = $("testDescription");
  testSelect.innerHTML = TESTS.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  function updateTest() {
    const selected = TESTS.find(t => t.id === testSelect.value) || TESTS[0];
    DATA = selected.data;
    testDescription.textContent = `${selected.description || ""} • ${DATA.length} вопросов`;
    $("totalQuestions").textContent = `В базе ${DATA.length} вопросов`;
  }
  testSelect.addEventListener("change", updateTest);
  updateTest();

  $("startBtn").addEventListener("click", start);
  $("checkBtn").addEventListener("click", checkAnswer);
  $("nextBtn").addEventListener("click", nextQuestion);
  $("restartBtn").addEventListener("click", start);
  $("reviewBtn").addEventListener("click", () => $("review").classList.toggle("hidden"));
  $("quitBtn").addEventListener("click", () => {
    if (confirm("Выйти из текущего теста? Прогресс будет сброшен.")) showStart();
  });

  function start() {
    const countValue = $("countSelect").value;
    mode = document.querySelector('input[name="mode"]:checked').value;
    const count = countValue === "all" ? DATA.length : Math.min(Number(countValue), DATA.length);

    questions = shuffle(DATA).slice(0, count).map(q => ({
      ...q,
      options: shuffle(q.options.map(o => ({...o})))
    }));
    index = 0;
    answers = Array(questions.length).fill(null);
    checked = false;

    $("startScreen").classList.add("hidden");
    $("resultScreen").classList.add("hidden");
    $("quizScreen").classList.remove("hidden");
    renderQuestion();
  }

  function showStart() {
    $("quizScreen").classList.add("hidden");
    $("resultScreen").classList.add("hidden");
    $("startScreen").classList.remove("hidden");
  }

  function renderQuestion() {
    checked = false;
    const q = questions[index];
    $("questionCounter").textContent = `Вопрос ${index + 1} из ${questions.length}`;
    $("sectionLabel").textContent = q.section || "Тест";
    $("progressBar").style.width = `${(index / questions.length) * 100}%`;
    $("progressText").textContent = `${Math.round((index / questions.length) * 100)}%`;
    $("questionText").textContent = q.question;

    const multi = q.options.filter(o => o.correct).length > 1;
    $("answerType").textContent = multi ? "Несколько правильных ответов" : "Один правильный ответ";
    $("instruction").textContent = multi
      ? "Выберите все варианты, которые считаете правильными."
      : "Выберите один вариант ответа.";

    $("options").innerHTML = q.options.map((o, i) => {
      const type = multi ? "checkbox" : "radio";
      const id = `opt-${index}-${i}`;
      return `<div class="option">
        <input type="${type}" id="${id}" name="answer" value="${i}">
        <label for="${id}">
          <span class="letter">${String.fromCharCode(65 + i)}</span>
          <span>${escapeHtml(o.text)}</span>
        </label>
      </div>`;
    }).join("");

    $("feedback").className = "feedback hidden";
    $("feedback").textContent = "";
    $("checkBtn").classList.remove("hidden");
    $("nextBtn").classList.add("hidden");
  }

  function getSelected() {
    return [...document.querySelectorAll('input[name="answer"]:checked')].map(el => Number(el.value)).sort((a,b) => a-b);
  }

  function arraysEqual(a,b) {
    return a.length === b.length && a.every((v,i) => v === b[i]);
  }

  function correctIndexes(q) {
    return q.options.map((o,i) => o.correct ? i : -1).filter(i => i >= 0);
  }

  function checkAnswer() {
    if (checked) return;
    const q = questions[index];
    const selected = getSelected();
    if (!selected.length) {
      alert("Выберите хотя бы один вариант.");
      return;
    }

    answers[index] = selected;
    checked = true;

    const correct = correctIndexes(q);
    const isCorrect = arraysEqual(selected, correct);

    document.querySelectorAll(".option").forEach((el, i) => {
      el.querySelector("input").disabled = true;
      if (q.options[i].correct) el.classList.add("correct");
      if (selected.includes(i) && !q.options[i].correct) el.classList.add("wrong");
    });

    if (mode === "practice") {
      const feedback = $("feedback");
      feedback.className = `feedback ${isCorrect ? "good" : "bad"}`;
      feedback.textContent = isCorrect
        ? "Ответ правильный."
        : "Ответ неверный. Правильные варианты подсвечены зелёным.";
      $("checkBtn").classList.add("hidden");
      $("nextBtn").classList.remove("hidden");
      $("nextBtn").textContent = index === questions.length - 1 ? "Показать результат" : "Следующий вопрос";
    } else {
      // In exam mode move directly after checking, without revealing correctness.
      if (index === questions.length - 1) {
        finish();
      } else {
        index++;
        renderQuestion();
      }
    }
  }

  function nextQuestion() {
    if (index === questions.length - 1) {
      finish();
    } else {
      index++;
      renderQuestion();
    }
  }

  function finish() {
    const correctCount = questions.reduce((sum, q, i) =>
      sum + (answers[i] && arraysEqual(answers[i], correctIndexes(q)) ? 1 : 0), 0);
    const total = questions.length;
    const percent = total ? Math.round(correctCount / total * 100) : 0;
    const wrong = total - correctCount;

    $("quizScreen").classList.add("hidden");
    $("resultScreen").classList.remove("hidden");
    $("scorePercent").textContent = `${percent}%`;
    $("scoreSummary").textContent = `Вы ответили правильно на ${correctCount} из ${total} вопросов.`;
    $("correctCount").textContent = correctCount;
    $("wrongCount").textContent = wrong;
    $("passedCount").textContent = total;

    const deg = Math.round(percent * 3.6);
    $("scorePercent").parentElement.parentElement.style.background =
      `conic-gradient(var(--primary) ${deg}deg,#e9edf5 ${deg}deg)`;

    buildReview();
  }

  function buildReview() {
    const wrongItems = questions.map((q,i) => ({q,i}))
      .filter(({q,i}) => !answers[i] || !arraysEqual(answers[i], correctIndexes(q)));

    $("reviewList").innerHTML = wrongItems.length
      ? wrongItems.map(({q,i}) => {
          const selected = answers[i] || [];
          return `<div class="review-item">
            <div class="review-q">${i + 1}. ${escapeHtml(q.question)}</div>
            ${q.options.map((o,oi) => {
              const picked = selected.includes(oi);
              const cls = o.correct ? "good" : (picked ? "bad" : "");
              const mark = o.correct ? "✓" : (picked ? "✗" : "•");
              return `<div class="review-opt ${cls}">${mark} ${escapeHtml(o.text)}</div>`;
            }).join("")}
          </div>`;
        }).join("")
      : "<p>Ошибок нет — все ответы совпали с ключами из исходного файла.</p>";
  }
})();
