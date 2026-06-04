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

    // Front side is removed. Only back side remains.

    // 3. Back Side Elements (inside bg-card)
    const backSide = this.container.querySelector('.bg-card');
    if (backSide) {
      this.backWord = backSide.querySelector('h2');
      this.image = backSide.querySelector('img');
      this.ipa = backSide.querySelector('p.font-mono');
      
      // Meaning is the next p element or has text-xl/font-semibold classes
      this.meaning = backSide.querySelector('p.text-xl') || backSide.querySelector('p.font-semibold');
      
      // Pronunciation button for Word
      // Located in the header div wrapper containing the h2
      const titleWrapper = backSide.querySelector('h2')?.parentElement;
      if (titleWrapper) {
        this.btnPlayWord = titleWrapper.querySelector('button');
      }

      // Example rows and audio button
      // Find the row containing text-center & justify-center gap-2
      const exampleWrapper = backSide.querySelector('.w-full.flex.justify-center.items-center.gap-2.text-center');
      if (exampleWrapper) {
        const textContainer = exampleWrapper.querySelector('.flex-1');
        if (textContainer) {
          // English example is the first paragraph (usually p.text-sm.text-foreground)
          this.exampleEn = textContainer.querySelector('p:not(.italic)');
          // Vietnamese example is the second paragraph (usually p.italic)
          this.exampleVi = textContainer.querySelector('p.italic') || textContainer.querySelectorAll('p')[1];
        }
        this.btnPlayExample = exampleWrapper.querySelector('button');
      }
      
      // 4. Pattern and CEFR Elements (inside the green card)
      this.patternEn = this.container.querySelector('#back-pattern-en');
      this.patternVi = this.container.querySelector('#back-pattern-vi');
      this.cefrLevel = this.container.querySelector('#back-cefr');
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

    // Reset card flip is no longer needed since it's a single face
    
    // Set word
    if (this.backWord) {
      this.backWord.textContent = data.word || '';
    }

    // 4. Update Word image
    if (this.image) {
      if (data.image) {
        this.image.src = data.image;
        this.image.alt = data.word || 'word image';
        
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

    // 9. Update Pattern EN
    if (this.patternEn) {
      let content = data.patternEn || '';
      let hasMarkdown = content.includes('*');
      if (hasMarkdown) {
        content = content.replace(/\*\*(.*?)\*\*/g, '<span class="border-b border-white">$1</span>')
                         .replace(/\*(.*?)\*/g, '<span class="border-b border-white">$1</span>');
      }
      this.patternEn.innerHTML = content;
    }

    // 10. Update Pattern VI
    if (this.patternVi) {
      let content = data.patternVi || '';
      const cleanContent = content.replace(/^(-\s*&gt;|\s*->\s*|→\s*)/, '').trim();
      let highlighted = cleanContent;
      highlighted = highlighted.replace(/\*\*(.*?)\*\*/g, '<span class="border-b border-white font-bold">$1</span>')
                               .replace(/\*(.*?)\*/g, '<span class="border-b border-white font-bold">$1</span>');
      this.patternVi.innerHTML = `→ ${highlighted}`;
    }

    // 11. Update CEFR Level
    if (this.cefrLevel) {
      this.cefrLevel.textContent = data.cefrLevel || '';
    }
  }
}

// Export for global availability or ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Flashcard;
} else {
  window.Flashcard = Flashcard;
}
