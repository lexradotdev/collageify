(function() {
    console.log('MultiSelect component loaded...');

    const DEFAULT_OPTIONS = {
        isMultiSelect: true,
        items: [],
        selectedIndeces: [0],
        selectedIndex: 0,
        button: {
            class: {
                default: 'btn-primary',
                selected: 'btn-selected'
            }
        },
    };

    /**
     * MultiSelect component for creating a group of selectable buttons.
     * @class
     */
    class MultiSelect {
        /**
         * Creates a MultiSelect component.
         * @param {HTMLElement|string} div - The parent element (or selector) to which buttons are appended.
         * @param {Object} options - Configuration options for the component.
         */
        constructor(div, options) {
            div = (typeof div === 'string') ? document.querySelector(div) : div;

            if (!div) {
                throw new Error('Parent element is required');
            }
            
            this.parent = div;
            this.id = div.id;
            this.configs = Object.assign({}, DEFAULT_OPTIONS, options || {});

            const opts = this.configs;
            this.#isMultiSelect = opts.isMultiSelect;
            this.#items = [...opts.items];
            this.#selectedIndeces = [...opts.selectedIndeces];
            this.#selectedIndex = opts.selectedIndex;
            this.#buttons = [];
        }

        // Private properties
        #isMultiSelect;
        #items;
        #selectedIndeces;
        #selectedIndex;
        #buttons;

        // Getters and setters

        get buttons() {
            return [...this.#buttons];
        }

        get selectedIndex() {
            return this.#selectedIndex;
        }

        set selectedIndex(index) {
            if (this.#isMultiSelect) throw new Error("You cannot set a single index for multi-selection.");
            if (index < 0 || index >= this.#items.length) throw new Error("Index out of bounds");

            this.#selectedIndex = index;
        }

        get selectedIndeces() {
            return [...this.#selectedIndeces];
        }

        set selectedIndeces(indeces) {
            if (!this.#isMultiSelect) throw new Error("Cannot set multiple indices in single-select mode");

            this.#selectedIndeces = indeces;
        }

        get isMultiSelect() {
            return this.#isMultiSelect;
        }

        set isMultiSelect(isMultiSelect) {
            this.#isMultiSelect = isMultiSelect;
        }

        get items() {
            return [...this.#items];
        }

        set items(arrayItems) {
            this.#items = [...arrayItems];
        }

        // Public methods

        /**
         * Initializes the MultiSelect component and renders buttons.
         */
        initializeMultiselect() {
            this.#init();

            // Dispatch on load event
            this.#dispatch("onLoad", {
                items: this.#items,
                selectedIndex: this.#selectedIndex,
                selectedIndeces: this.#selectedIndeces,
                buttons: this.#buttons
            });
        }

        // Private methods

        /**
         * Internal initialization logic.
         */
        #init() {
            this.#renderItems();

            if (this.#isMultiSelect) {
                if (this.#selectedIndeces.length > 0) {
                    this.#selectedIndeces.forEach((index) => {
                        const selectedButton = this.#buttons[index];
                        if (selectedButton) {
                            this.#toggleMultiSelection(selectedButton, true);
                        }
                    });
                }
            } else {
                if (this.#selectedIndex > -1) {
                    const selectedButton = this.#buttons[this.#selectedIndex];
                    if (selectedButton) {
                        this.#toggleSingleSelection(selectedButton, true);
                    }
                }
            }
        }

        #dispatch(event, args) {
            let handler = this.configs.events && this.configs.events[event];

            if (handler) {
                handler.call(this, args);
            }
        }

        /**
         * Renders button elements and appends them to the parent using a document fragment.
         */
        #renderItems() {
            const fragment = document.createDocumentFragment();
            
            this.#items.forEach((item, index) => {
                const buttonElement = this.#createButton(`btn${index}_${item.label}`, item.label, index);
                fragment.appendChild(buttonElement);
                this.#buttons.push(buttonElement);
            });
            
            this.parent.appendChild(fragment);
        }

        /**
         * Creates an individual button element with event handling.
         * @param {string} id - The ID for the button.
         * @param {string} label - The label displayed on the button.
         * @param {number} index - Index of the button in the item list.
         * @returns {HTMLButtonElement}
         */
        #createButton(id, label, index) {
            const btn = document.createElement('button');
            
            btn.id = id;
            btn.textContent = label;
            btn.classList.add(this.configs.button.class.default);
            
            btn._clickHandler = () => {
                if (this.isMultiSelect) {
                    this.#toggleMultiSelection(btn, index);
                    
                    const selectedIndex = this.#selectedIndeces.indexOf(index);
                    if (selectedIndex > -1) {
                        this.#selectedIndeces.splice(selectedIndex, 1);
                    } else {
                        this.#selectedIndeces.push(index);
                    }
                } else {
                    this.#toggleSingleSelection(btn, index);
                    
                    this.#selectedIndex = index;
                }

                this.#dispatch("onSelectedIndexChanged", {
                    button: this.#buttons,
                    items: this.#items,
                    selectedIndex: this.#selectedIndex,
                    selectedIndeces: this.#selectedIndeces,
                })
            };
            
            btn.addEventListener('click', btn._clickHandler);
            return btn;
        }

        /**
         * Toggles the visual state of a button in multi-select mode.
         * @param {HTMLElement} btn - The button to toggle.
         */
        #toggleMultiSelection(btn) {
            btn.classList.toggle(this.configs.button.class.selected);
        }

        /**
         * Sets the selected state for a button in single-select mode, clearing others.
         * @param {HTMLElement} btn - The button to activate.
         */
        #toggleSingleSelection(btn) {
            this.#buttons.forEach(button => {
                button.classList.remove(this.configs.button.class.selected);
            });
            
            btn.classList.add(this.configs.button.class.selected);
        }
    }

    // Exposes the component to the global scope
    window.MultiSelect = MultiSelect;
})();
