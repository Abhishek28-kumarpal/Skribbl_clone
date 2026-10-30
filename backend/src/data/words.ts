export const wordBank = {
  animals: [
    'dog', 'cat', 'elephant', 'lion', 'tiger', 'bear', 'monkey', 'rabbit',
    'bird', 'fish', 'snake', 'horse', 'zebra', 'giraffe', 'whale', 'shark',
    'penguin', 'flamingo', 'butterfly', 'bee', 'ant', 'spider', 'octopus', 'dolphin'
  ],
  food: [
    'pizza', 'burger', 'sandwich', 'pasta', 'sushi', 'taco', 'ice cream',
    'cake', 'cookie', 'apple', 'banana', 'orange', 'strawberry', 'watermelon',
    'bread', 'cheese', 'egg', 'chocolate', 'coffee', 'tea', 'soup'
  ],
  objects: [
    'car', 'bicycle', 'airplane', 'boat', 'train', 'house', 'tree', 'flower',
    'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'book', 'pen', 'phone',
    'computer', 'keyboard', 'mouse', 'chair', 'table', 'bed', 'door', 'window'
  ],
  places: [
    'beach', 'mountain', 'forest', 'desert', 'city', 'village', 'castle',
    'temple', 'church', 'school', 'hospital', 'library', 'museum', 'park',
    'zoo', 'cinema', 'restaurant', 'hotel', 'airport', 'station'
  ],
  professions: [
    'doctor', 'nurse', 'teacher', 'student', 'engineer', 'architect',
    'painter', 'musician', 'actor', 'cook', 'chef', 'pilot', 'sailor',
    'soldier', 'police', 'firefighter', 'farmer', 'builder', 'scientist',
    'lawyer', 'judge', 'artist', 'dancer'
  ],
  sports: [
    'football', 'basketball', 'tennis', 'baseball', 'cricket', 'hockey',
    'volleyball', 'badminton', 'ping pong', 'golf', 'swimming', 'running',
    'cycling', 'skateboarding', 'surfing', 'skiing', 'boxing', 'wrestling',
    'gymnastics', 'archery', 'diving'
  ],
  actions: [
    'jump', 'run', 'walk', 'dance', 'sing', 'sleep', 'eat', 'drink', 'swim',
    'fly', 'drive', 'write', 'read', 'draw', 'paint', 'cook', 'clean', 'build',
    'laugh', 'cry', 'hug', 'push', 'pull', 'throw', 'catch'
  ],
  misc: [
    'rocket', 'spaceship', 'dinosaur', 'pirate', 'ninja', 'ghost', 'zombie',
    'vampire', 'werewolf', 'dragon', 'unicorn', 'crown', 'treasure', 'bomb',
    'gift', 'wedding', 'birthday', 'christmas', 'halloween', 'valentines'
  ]
};

export function getRandomWords(count: number): string[] {
  const allWords = Object.values(wordBank).flat();
  const selected: string[] = [];

  while (selected.length < count && allWords.length > 0) {
    const randomIndex = Math.floor(Math.random() * allWords.length);
    const word = allWords[randomIndex];
    selected.push(word);
    allWords.splice(randomIndex, 1);
  }

  return selected;
}
