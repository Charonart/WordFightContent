/**
 * Flashcard component controller for WordFight.
 * Enables updating the flashcard component dynamically based on JSON data.
 */
class Flashcard {
  /**
   * Initialize a new Flashcard controller.
   * @param {HTMLElement|string} element - The root DOM element of the flashcard or a query selector string.
   * @param {Object} options - Custom configuration options.
   * @param {boolean} [options.autoHighlight=true] - Auto-highlight the word inside example sentences using beautiful styles.
   * @param {string} [options.speechLang='en-US'] - Speech language code for Text-to-Speech (TTS).
   * @param {Function} [options.onExplain=null] - Custom callback function when the "Giải thích thêm" button is clicked. If null, a built-in premium modal will be shown.
   */
  constructor(element, options = {}) {
    this.container = typeof element === 'string' ? document.querySelector(element) : element;
    if (!this.container) {
      console.error('Flashcard Error: Root container element not found!');
      return;
    }

    this.options = Object.assign({
      autoHighlight: true,
      speechLang: 'en-US',
      onExplain: null
    }, options);

    this.data = null;
    this.isFlipped = false;

    this.initSelectors();
    this.initEvents();
  }

  /**
   * Find and cache all target DOM elements within the container.
   */
  initSelectors() {
    // 1. Flipping container: has transition-transform and 3D styles
    this.cardInner = this.container.querySelector('.transition-transform')
      || this.container.querySelector('#flashcard-container')
      || this.container.querySelector('.relative.w-full.rounded-2xl.shadow-2xl');

    // 2. Front Side Elements (inside bg-background)
    const frontSide = this.container.querySelector('.bg-background');
    if (frontSide) {
      this.frontWord = frontSide.querySelector('h2');
    } else {
      this.frontWord = this.container.querySelectorAll('h2')[0];
    }

    // 3. Back Side Elements (inside bg-card)
    const backSide = this.container.querySelector('.bg-card') || this.container;
    if (backSide) {
      this.backWord = backSide.querySelector('#back-word') || backSide.querySelector('h2');
      this.image = backSide.querySelector('img');
      this.ipa = backSide.querySelector('#back-word-ipa') || backSide.querySelector('p.font-mono');
      this.meaning = backSide.querySelector('#back-word-meaning') || backSide.querySelector('p.text-xl') || backSide.querySelector('p.font-semibold');
      
      // Example rows
      this.exampleEn = this.container.querySelector('#back-example-en') || backSide.querySelector('p:not(.italic)');
      this.exampleVi = this.container.querySelector('#back-example-vi') || backSide.querySelector('p.italic');
      this.explain = this.container.querySelector('#back-explain');
      this.cefrLevel = this.container.querySelector('#back-cefr');
      this.bgLayer = this.container.querySelector('#card-bg-layer');
    }
  }

  /**
   * Set up all required event listeners.
   */
  initEvents() {
    // 1. Flip card click event
    if (this.cardInner) {
      // Toggle card rotation. Avoid trigger on buttons or nested elements
      this.cardInner.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('svg')) {
          return;
        }
        this.toggleFlip();
      });
    }

    // 2. Play Word Audio Button Event
    if (this.btnPlayWord) {
      this.btnPlayWord.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.data) {
          if (this.data.audioWord) {
            this.playAudioUrl(this.data.audioWord, this.data.word);
          } else if (this.data.word) {
            this.speak(this.data.word);
          }
        }
      });
    }

    // 3. Play Example Audio Button Event
    if (this.btnPlayExample) {
      this.btnPlayExample.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.data) {
          if (this.data.audioExample) {
            this.playAudioUrl(this.data.audioExample, this.data.exampleEn);
          } else if (this.data.exampleEn) {
            // Remove HTML formatting to speak pure text
            const plainText = this.data.exampleEn.replace(/<[^>]*>/g, '');
            this.speak(plainText);
          }
        }
      });
    }
  }

  /**
   * Flip the card to a specific face.
   * @param {boolean} [isFlipped] - Forces the flip state. True = Back, False = Front.
   */
  flip(isFlipped) {
    if (!this.cardInner) return;
    this.isFlipped = typeof isFlipped === 'boolean' ? isFlipped : !this.isFlipped;

    if (this.isFlipped) {
      // Rotate 180 deg to show card details (Back Side)
      this.cardInner.style.transform = 'rotateY(180deg)';
      this.cardInner.classList.add('[transform:rotateY(180deg)]');
    } else {
      // Rotate 0 deg to show word only (Front Side)
      this.cardInner.style.transform = 'rotateY(0deg)';
      this.cardInner.classList.remove('[transform:rotateY(180deg)]');
    }
  }

  /**
   * Toggle the card flip between Front and Back.
   */
  toggleFlip() {
    this.flip();
  }

  /**
   * Speak input text using Speech Synthesis API (TTS).
   * @param {string} text - Text to read aloud.
   */
  speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speaking
      const cleanText = text.replace(/<[^>]*>/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = this.options.speechLang;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-speech not supported in this browser.');
    }
  }

  /**
   * Play an audio file from a URL/path with fallback to TTS if it fails.
   * @param {string} url - Audio URL.
   * @param {string} fallbackText - Fallback text to speak.
   */
  playAudioUrl(url, fallbackText) {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    this.currentAudio = new Audio(url);
    this.currentAudio.play().catch(err => {
      console.warn('Audio URL playback failed, falling back to TTS:', err);
      if (fallbackText) {
        this.speak(fallbackText);
      }
    });
  }

  /**
   * Automatically wrap target words in example text with HTML highlighting tags.
   * @param {string} text - The input example sentence.
   * @param {string} query - Word to highlight.
   * @returns {string} - Highlighted text.
   */
  highlightWord(text, query) {
    if (!text || !query) return text;
    // Skip if already contains styled highlight elements
    if (text.includes('<strong') || text.includes('<span class="font-bold')) {
      return text;
    }

    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match word boundary to avoid partial highlight
    const regex = new RegExp(`\\b(${escapedQuery})\\b`, 'gi');
    return text.replace(regex, '<strong class="font-bold fancy-underline text-primary">$1</strong>');
  }

  /**
   * Update the component elements with JSON data.
   * @param {Object} data - Vocabulary object containing word properties.
   */
  update(data) {
    if (!data) return;
    this.data = data;

    // Update background image
    if (this.bgLayer && data.bgImage) {
      this.bgLayer.style.backgroundImage = `url('${data.bgImage}')`;
    }

    // 1. Reset card face to Front when word changes
    this.flip(false);

    // 2. Set Front side word
    if (this.frontWord) {
      this.frontWord.textContent = data.word || '';
    }

    // 3. Set Back side word
    if (this.backWord) {
      this.backWord.textContent = data.word || '';
    }

    // 4. Update Word image
    if (this.image) {
      if (data.image) {
        const rawImg = (data.image || '').trim();
        if (rawImg.startsWith('data:')) {
          this.image.removeAttribute('crossOrigin');
          this.image.src = rawImg;
        } else {
          this.image.crossOrigin = "anonymous";
          if (/^https?:\/\//i.test(rawImg) && (rawImg.includes('pinimg.com') || rawImg.includes('phototourl.com'))) {
            this.image.src = `https://images.weserv.nl/?url=${encodeURIComponent(rawImg)}`;
          } else {
            this.image.src = rawImg;
          }
        }
        this.image.alt = data.word || 'word image';
        
        // Update image fit mode (cover, contain, fill, scale-down)
        const fitMode = data.imageFit || 'cover';
        this.image.style.objectFit = fitMode;
        this.image.classList.remove('object-cover', 'object-contain', 'object-fill', 'object-scale-down');
        this.image.classList.add(`object-${fitMode}`);

        // Ensure image container parent wrapper is visible if hidden
        const wrapper = this.image.closest('.w-32') || this.image.parentElement;
        if (wrapper) wrapper.style.display = 'block';
      } else {
        // Hide image wrapper if no image is available
        const wrapper = this.image.closest('.w-32') || this.image.parentElement;
        if (wrapper) wrapper.style.display = 'none';
      }
    }

    // 5. Update IPA phonetic transcription
    if (this.ipa) {
      this.ipa.textContent = data.ipa || '';
    }

    // 6. Update translation meaning text
    if (this.meaning) {
      this.meaning.textContent = data.meaning || '';
    }

    // 7. Update English Example Sentence
    if (this.exampleEn) {
      let content = data.exampleEn || '';
      // Parse markdown asterisks for manual highlighting
      let hasMarkdown = content.includes('*');
      if (hasMarkdown) {
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold fancy-underline text-primary">$1</strong>')
                         .replace(/\*(.*?)\*/g, '<strong class="font-bold fancy-underline text-primary">$1</strong>');
      } else if (this.options.autoHighlight && content && data.word) {
        content = this.highlightWord(content, data.word);
      }
      this.exampleEn.innerHTML = `<span><span>${content}</span></span>`;
    }

    // 8. Update Vietnamese Example Translation
    if (this.exampleVi) {
      let content = data.exampleVi || '';
      // Strip any existing "->" arrows from raw text
      const cleanContent = content.replace(/^(-\s*&gt;|\s*->\s*)/, '').trim();
      
      // Parse markdown asterisks for manual highlighting
      let highlighted = cleanContent;
      highlighted = highlighted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold fancy-underline text-primary">$1</strong>')
                               .replace(/\*(.*?)\*/g, '<strong class="font-bold fancy-underline text-primary">$1</strong>');

      this.exampleVi.innerHTML = `-> <span><span>${highlighted}</span></span>`;
    }
  }
}

// Export for global availability or ES modules
if (typeof window !== 'undefined') {
  window.Flashcard = Flashcard;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Flashcard;
}
