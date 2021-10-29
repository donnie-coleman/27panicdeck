document.addEventListener('click', function() {
    document.querySelector('.input').focus();
});

const screen = document.querySelector('.pre');

// # of move cards per year per difficulty level
const HARD = [3,4,4,5];
const NORM = [2,3,3,4];
const EASY = [1,2,2,3];
let DIFFICULTY = HARD;
// # of wild cards
const WILDS = 4;
const MOVES_TO_FORCE_RESHUFFLE = 3;

// year index to year-color and year-role_starting_position mapping
const YEARS = [
                {year: 1930, color: 'green', role:'Geologist'},
                {year: 1957, color: 'yellow', role:'Astronomer'},
                {year: 1984, color: 'red', role:'Chemist'},
                {year: 2011, color: 'blue', role:'Physicist'},
              ];

// tracks
const ALPHA = 'abcdefghijklmnop';

// global_state
let state = {
              difficulty: DIFFICULTY,
              cards: {
                build: {},
                wild: [],
                move: []
              },
              deck: [],
              drawn: [],
              drawn_moves: [],
              roles: [],
              curr_role: 0
            };
const launch = () => {
  document.querySelector('.input').focus();
  startCursor();

  if (Window.localStorage && localStorage.getItem('state')) {
    clear(`Hello, I am the 27P Desktop Estimated Chaos Knowledge-Base (D.E.C.K.)`);
    prompt(`Would you like to continue saving the World? (y/N)`);
    document.addEventListener("keypress", continueMenuCallback);
  }
  else {
    initializeState();
    clear(`Hello, I am the 27P Desktop Estimated Chaos Knowledge-Base (D.E.C.K.)`);
    prompt(`Would you like to Save the World today? (Y/n)`);
    document.addEventListener("keypress", mainMenuCallback);
  }
};
const initializeState = () => {
  const addToDeck = (card) => state.deck.push(card);
  const makeWildCard = () => { return {type: 'WILD'} };
  const makeTrackCard = track => { return {type: 'TRACK', track} };
  const makeMoveCard = year => { return {type: 'MOVE', year} };

  // add track cards
  for (let a = 0; a < ALPHA.length; a++) {
    state.cards.build[ALPHA[a]] || (state.cards.build[ALPHA[a]] = []);

    for (let b=0; b < 3; b++) { // three cards for tracks a-p
      state.cards.build[ALPHA[a]].push(true);
      // add track cards to deck
      state.deck.push(makeTrackCard(ALPHA[a]));
    }
  }

  // add move cards
  for (let year = 0; year < state.difficulty.length; year++) {
    state.cards.move[year] || (state.cards.move[year] = []);
    for(let card = 0; card < state.difficulty[year]; card++) {
      state.cards.move[year][card] || (state.cards.move[year][card] = []);
      state.cards.move[year][card].push(true);
      state.deck.push(makeMoveCard(year));
    }
  }

  // add wild cards
  for(let w = 0; w < 4; w++) {
    state.cards.wild.push(true);
    //add wild cards to deck
    state.deck.push(makeWildCard());
  }

  // shuffle deck
  shuffleDeck();

  state.roles = [];

  state.curr_role = 0;

  saveState();
};

const continueMenuCallback = event => {
  if(event.key === 'y') {
    state = JSON.parse(localStorage.getItem('state'));
    document.removeEventListener("keypress", continueMenuCallback);
    processing(gameContinue);
  }
  else if (event.key === 'N') {
    localStorage.clear();
    document.removeEventListener("keypress", continueMenuCallback);
    launch(); // start over
  }
  else {
    invalid();
  }
}
const mainMenuCallback = event => {
  if (event.key === 'n') { // game End
    invalid(false);
    document.removeEventListener("keypress", mainMenuCallback);
    println('Understood. Saving the World is not for the weak or faint of heart.');
    document.querySelector('.prompt').innerHTML = "RELOAD TO RECONSIDER"; // blinking prompt
    prompt(' ');
  }
  else if (event.key === 'Y') { // game Start
    document.removeEventListener("keypress", mainMenuCallback);
    clear();
    roleStart();
  }
  else { // main menu
    invalid();
  }

  event.preventDefault();
};
const drawCallback = event => {
  if(event.key === 'C') {
    draw();
  }
  else if (event.key === 'Shift') {
    // no-op
  }
  else {
    invalid();
  }
  const input = document.querySelector('.input');
  // clear field
  input.innerHTML = "";
};
const roleMenuCallback = event => {
  const input = document.querySelector('.input');
  if (event.key === 'Enter') {
      const curr = state.roles.length;
      state.roles[curr] = input.innerHTML.trim().replace(/\n/g, ' ');
      input.removeEventListener("keypress", roleMenuCallback);
      println(`<span class='scientist ${YEARS[curr].color.toLowerCase()}'>${YEARS[curr].role}</span>: ${state.roles[curr] || '[none]'}`);

      if (state.roles.length < 4) {
        roleStart(); // get next role
      }
      else if (state.roles.filter(role => !role).length > 2) {
          state.roles = [];
          clear("<span class='red'>THIS MISSION REQUIRES AT LEAST TWO SCIENTISTS. TRY AGAIN!</span>");
          roleStart();
      }
      else {
        //input.contentEditable = false; // FOR IPAD
        input.innerHTML = '';
        input.blur();

        prompt("Are these names correct? (Y/N)");
        document.addEventListener("keypress", areYouSureCallback);
    }

    event.preventDefault(); // stops adding breaks
    event.stopPropagation(); // stops spill-over to other event listeners
    return false;
  }
};
const areYouSureCallback = event => {
  if (event.key === 'Y') {
    document.removeEventListener("keypress", areYouSureCallback);

    saveState();
    processing(gameStart);
  }
  else if (event.key === 'N') {
    document.removeEventListener("keypress", areYouSureCallback);

    state.roles = [];
    clear();
    roleStart();
  }
  else {
    invalid();
  }

  event.preventDefault();
};
const reshuffleCallback = event => {
  if(event.key === 'R') {
    replaceMovesAndShuffle();
    renderMoves();

    document.removeEventListener("keyup", reshuffleCallback);
    document.addEventListener("keyup", drawCallback);
    saveState();
    cardPrompt();
    invalid(false);
  }
  else if (event.key === 'Shift') {
    // no-op
  }
  else {
    invalid();
  }
  
  const input = document.querySelector('.input');
  input.innerHTML = "";
};

const roleStart = () => {
  const input = document.querySelector('.input');
  input.innerHTML = '';
  input.contentEditable = true;
  input.focus();
  input.addEventListener("keypress", roleMenuCallback);
  let role_prompt = `Enter the name of the <span class='${YEARS[state.roles.length].color}'>${YEARS[state.roles.length].role}</span> (Enter for none): `;
  prompt(null, role_prompt);
};
const gameContinue = () => {
  gameStart();
};
const gameStart = () => {
  renderMoves();
  document.addEventListener("keyup", drawCallback);
  clear();
  if(state.drawn_moves.length < MOVES_TO_FORCE_RESHUFFLE) { // check for drawn moves
    cardPrompt();
  }
  else {
    draw(); // this will show a prompt to resuffle
  }
};

const draw = () => {
  // check for drawn moves
  if(state.drawn_moves.length < MOVES_TO_FORCE_RESHUFFLE) {
    let card = state.deck.shift();
    let text = '';

    switch(card.type) {
        case 'WILD':
          text = '[Wild]';
        break;

        case 'MOVE':
          text = `<span class='move_card ${YEARS[card.year].color}'>[Move ${YEARS[card.year].year}]</span>`;
          // check for need to reshuffle
        break;

        case 'TRACK':
          text = `[Track ${card.track.toUpperCase()}]`;
        break;

        default:
          text = "ERROR";
    }

    println(`<i>${currentPlayerName()} received a ${text} C.A.R.D.</i>`);
    invalid(false);

    state.curr_role++; // increment to next player

    if(card.type !== 'MOVE') {
      state.drawn.push(card);
    }
    else {
      state.drawn_moves.push(card);
    }

    saveState();

    renderMoves();
  }

  // check drawn moves again
  if(state.drawn_moves.length >= MOVES_TO_FORCE_RESHUFFLE) {
    prompt(`Press R to reconstitute C.A.R.D. stack: `);
    updateRemaining();
    document.removeEventListener("keyup", drawCallback);
    document.addEventListener("keyup", reshuffleCallback);
  }
  else {
    cardPrompt(); // prompt for next player's card
  }
};
const updateRemaining = () => {
  document.querySelector('.remaining_cards').innerHTML = state.deck.length;
}
const cardPrompt = () => {
  // find the next filled role
  while(!state.roles[state.curr_role % 4]) {
    state.curr_role++;
  };

  prompt(null, `${currentPlayerName()}: Press C to receive a C.A.R.D.: `);
  updateRemaining();
};
const currentPlayerName = () => {
    let currRoleNumber = state.curr_role % 4;
    let currPlayer = state.roles[currRoleNumber];
    let currRole = `<span class='scientist ${YEARS[currRoleNumber].color.toLowerCase()}'>${YEARS[currRoleNumber].role}</span>`;

    return `${currRole} (${currPlayer})`;
};
const renderMoves = () => {
  let row = '';

  // add drawn moves
  state.drawn_moves.forEach( card => {
      row += `<span class='move-cell ${YEARS[card.year].color}_year' style='color: ${YEARS[card.year].color}'>MOVE</span>`;
  });
  // add empty spaces
  for(let empties = state.drawn_moves.length; empties < MOVES_TO_FORCE_RESHUFFLE; empties++) {
      row += `<span class='move-cell empty_year'>&nbsp;</span>`;
  }

  document.querySelector('.move').innerHTML = row;
  document.querySelector('.moves').style.display = 'block';
};
const replaceMovesAndShuffle = () => {
  state.deck = state.deck.concat(state.drawn_moves);
  state.drawn_moves = [];
  shuffleDeck();
};

let cursor_blink = true;
let p_interval = null;
const startCursor = () => {
  if (p_interval) return; // don't restart the cursor

  p_interval = setInterval(() => {
    document.querySelector('.prompt').style.display = cursor_blink ? 'inline' : 'none';
    cursor_blink = !cursor_blink;
  }, 500);
};
const stopCursor = () => {
  document.querySelector('.prompt').style.display = 'none';
  clearInterval(p_interval);
  p_interval = null;
};

const prompt = (text, node) => {
  document.querySelector('.input').focus();
  let currentMessage = document.querySelector('.current-message');
  while (currentMessage.firstChild) {
    currentMessage.removeChild(currentMessage.firstChild);
  }
  if (text) {
    let text_node = document.createTextNode(text);
    currentMessage.appendChild(text_node);
  }
  else if (node) {
    currentMessage.innerHTML = node;
  }
};
const println = text => {
  let sp = document.createElement('SPAN');
    sp.innerHTML = text ? text + '<br>' : text;
    screen.append(sp);
  screen.scrollTop = screen.scrollHeight;
};
const clear = text => {
  text = text ? text : '';
  let child = screen.lastElementChild;
  while (child) {
    screen.removeChild(child);
    child = screen.lastElementChild;
  }
  println(text);
  invalid(false);
};

const beep = new Audio("beep.wav");
const invalid = show => {
  let invalid_key = document.querySelector('.invalid-key');
  if (show === false) {
    document.querySelector('.prompt').classList.remove('invalid');
  }
  else {
    beep.play();
    document.querySelector('.prompt').classList.add('invalid');
  }
  invalid_key.style.display = show === false ? 'none' : 'block';
};
const interval = 200;
let timeout = 0;
const processing = callback => {
  prompt();
  invalid(false);
  stopCursor();
  clear();

  setTimeout(()=>{ println('Analysing probabilities across four dimensions...'); }, timeout++*interval);
  setTimeout(()=>{ println('Measuring quantum wave functions...'); }, timeout++*interval);
  setTimeout(()=>{ println('Injecting strategic randomness...'); }, timeout++*interval);
  setTimeout(()=>{ println('Firing up Flux Capacitor...'); }, timeout++*interval);
  setTimeout(()=>{ clear(); callback(); timeout=0; startCursor(); }, timeout++*interval);
};

const shuffleDeck = () => {
  state.deck = randomize(state.deck);
};
const randomize = oldArray => {
    var array = oldArray.slice(); // SUPER important
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
};

const saveState = () => {
  if (!Window.localStorage) return; 
  localStorage.setItem('state', JSON.stringify(state));
};

launch();
