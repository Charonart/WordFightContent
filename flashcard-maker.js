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

    this.initSelectors();
    this.initEvents();
  }

  /**
   * Find and cache all target DOM elements within the container.
   */
  initSelectors() {
    // Single Face Card Elements (inside bg-card)
    const backSide = this.container.querySelector('.bg-card') || this.container;
    if (backSide) {
      this.backWord = backSide.querySelector('#back-word') || backSide.querySelector('h2');
      this.backWordType = backSide.querySelector('#back-word-type');
      this.image = backSide.querySelector('#back-word-img');
      this.imgSpinner = backSide.querySelector('#img-loading-spinner');
      this.ipa = backSide.querySelector('#back-word-ipa') || backSide.querySelector('p.font-mono');
      this.meaning = backSide.querySelector('#back-word-meaning') || backSide.querySelector('p.text-xl') || backSide.querySelector('p.font-semibold');
      
      // Example elements (Select by ID directly with fallback)
      this.exampleEn = this.container.querySelector('#back-example-en') || backSide.querySelector('p:not(.italic)');
      this.exampleVi = this.container.querySelector('#back-example-vi') || backSide.querySelector('p.italic');
      
      // 4. Explanation and CEFR Elements (inside the green card)
      this.explain = this.container.querySelector('#back-explain') || this.container.querySelector('#back-pattern-en');
      this.cefrLevel = this.container.querySelector('#back-cefr');
      this.bgLayer = this.container.querySelector('#card-bg-layer');
    }
  }

  /**
   * Set up all required event listeners.
   */
  initEvents() {
    // Image loading event handlers
    if (this.image) {
      this.image.addEventListener('load', () => {
        if (this.imgSpinner) this.imgSpinner.classList.add('hidden');
        this.image.classList.remove('opacity-0');
      });
      this.image.addEventListener('error', () => {
        const rawSrc = this.image.getAttribute('data-original-src') || '';
        // Nếu load trực tiếp bị chặn CORS hoặc hotlink, tự động fallback sang CORS Proxy (weserv.nl)
        if (rawSrc && /^https?:\/\//i.test(rawSrc) && !this.image.src.includes('images.weserv.nl')) {
          console.warn('Lỗi tải ảnh trực tiếp, tự động chuyển sang CORS Proxy (weserv.nl):', rawSrc);
          this.image.crossOrigin = "anonymous";
          this.image.src = `https://images.weserv.nl/?url=${encodeURIComponent(rawSrc)}`;
          return;
        }
        if (this.imgSpinner) this.imgSpinner.classList.add('hidden');
      });
    }
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

    // Reset card flip is no longer needed since it's a single face
    
    // Set word
    if (this.backWord) {
      this.backWord.textContent = data.word || '';
    }

    // Set word type
    if (this.backWordType) {
      if (data.wordType) {
        this.backWordType.textContent = `(${data.wordType})`;
        this.backWordType.style.display = 'inline-block';
      } else {
        this.backWordType.style.display = 'none';
      }
    }

    // 4. Update Word image
    if (this.image) {
      if (data.image) {
        if (this.imgSpinner) this.imgSpinner.classList.remove('hidden');
        this.image.classList.add('opacity-0');

        const rawImg = (data.image || '').trim();
        this.image.setAttribute('data-original-src', rawImg);

        if (rawImg.startsWith('data:')) {
          this.image.removeAttribute('crossOrigin');
          this.image.src = rawImg;
        } else {
          this.image.crossOrigin = "anonymous";
          // Nếu là link Pinterest hoặc PhotoToUrl (chặn CORS), cho qua weserv proxy ngay để render tức thì
          if (/^https?:\/\//i.test(rawImg) && (rawImg.includes('pinimg.com') || rawImg.includes('phototourl.com'))) {
            this.image.src = `https://images.weserv.nl/?url=${encodeURIComponent(rawImg)}`;
          } else {
            this.image.src = rawImg;
          }
        }
        this.image.alt = data.word || "word image";
        
        // Update image fit mode (cover, contain, fill, scale-down)
        const fitMode = data.imageFit || 'cover';
        this.image.style.objectFit = fitMode;
        this.image.classList.remove('object-cover', 'object-contain', 'object-fill', 'object-scale-down');
        this.image.classList.add(`object-${fitMode}`);

        // Ensure image container parent wrapper is visible if hidden
        const wrapper = this.image.closest('.w-32') || this.image.parentElement;
        if (wrapper) wrapper.style.display = 'flex';
      } else {
        if (this.imgSpinner) this.imgSpinner.classList.add('hidden');
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

    // 9. Update Explain
    if (this.explain) {
      let content = data.explain || '';
      let hasMarkdown = content.includes('*');
      if (hasMarkdown) {
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold fancy-underline">$1</strong>')
                         .replace(/\*(.*?)\*/g, '<strong class="font-bold fancy-underline">$1</strong>');
      }
      // Hỗ trợ cả ký tự xuống dòng thực tế (\n) và chuỗi ký tự escaped (\\n)
      content = content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
      this.explain.innerHTML = content;
    }

    // 11. Update CEFR Level
    if (this.cefrLevel) {
      this.cefrLevel.textContent = data.cefrLevel || '';
    }

    // Auto-scale content if it overflows
    this.autoFitContent();
  }

  /**
   * Auto scale the inner content to prevent overflow.
   * Maintains the 4:5 aspect ratio by uniformly scaling down the content
   * inside the fixed-size container.
   */
  autoFitContent() {
    const frame = this.container.querySelector('#capture-frame');
    const content = this.container.querySelector('#flashcard-content-wrapper');
    if (!frame || !content) return;
    
    const applyScale = () => {
      // Reset any previous transforms before measuring
      content.style.transform = 'none';
      content.style.transformOrigin = 'top center';
      
      const frameHeight = frame.clientHeight;
      // Force layout to ensure scrollHeight is accurate
      const contentHeight = content.scrollHeight;
      
      if (contentHeight > frameHeight) {
        // Calculate the scale needed to fit the content exactly
        // Multiply by 0.99 for a tiny safety margin to prevent any clipping edge-cases
        const scaleFactor = (frameHeight / contentHeight) * 0.99;
        content.style.transform = `scale(${scaleFactor})`;
      }
    };

    // Run once synchronously in case it works right away
    applyScale();
    
    // Run again after a short delay to account for webfont rendering or image loading
    setTimeout(applyScale, 50);
    setTimeout(applyScale, 200);
  }
}

// Export for global availability or ES modules
if (typeof window !== 'undefined') {
  window.Flashcard = Flashcard;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Flashcard;
}

