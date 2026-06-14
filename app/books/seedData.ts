export interface SeedBook { title: string; read?: boolean; goat?: boolean }
export interface SeedCat { name: string; books: SeedBook[] }
export const SEED_DATA: SeedCat[] = [
          { name: "Mindset & Self Growth", books: [
            { title: "Mindset", read: true },
            { title: "The Magic of Thinking Big", read: true },
            { title: "Think and Grow Rich", read: true },
            { title: "Who Moved My Cheese?", read: true },
            { title: "The Art of Not Giving a F*ck", read: true },
            { title: "The Power of Now", read: true },
            { title: "You Can Heal Your Life", read: true },
            { title: "The Alchemist", read: true },
            { title: "Attitude is Everything", read: false },
            { title: "Believe in Yourself", read: false },
            { title: "Win Your Inner Battle", read: false },
            { title: "The Psychology of Winning", read: false },
            { title: "The Courage to Be Disliked", read: false },
            { title: "Ikigai", read: false },
            { title: "Man's Search for Meaning", read: false },
            { title: "Do Epic Shit", read: false }
          ]},
          { name: "Psychology & Thinking", books: [
            { title: "Thinking, Fast and Slow", read: false }, { title: "Think Again", read: false },
            { title: "Clear Thinking", read: false }, { title: "The Intelligence Trap", read: false },
            { title: "Chatter", read: false }, { title: "Wiser", read: false }, { title: "Outliers", read: false }
          ]},
          { name: "Money, Wealth & Finance", books: [
            { title: "Rich Dad Poor Dad", read: false }, { title: "The Psychology of Money", read: false },
            { title: "The Millionaire Fastlane", read: true }, { title: "The Richest Man in Babylon", read: false },
            { title: "The Simple Path to Wealth", read: false }, { title: "Just Keep Buying", read: false },
            { title: "Main Street Millionaire", read: false }, { title: "Secret of the Millionaire Mind", read: false },
            { title: "The Algebra of Money", read: false }
          ]},
          { name: "Business & Strategy", books: [
            { title: "Good to Great", read: false }, { title: "Zero to One", read: false },
            { title: "$100 Startup", read: false }, { title: "Rework", read: false },
            { title: "The Challenger Sale", read: false }, { title: "Build Don't Talk", read: false },
            { title: "Trillion Dollar Coach", read: false }
          ]},
          { name: "Productivity & Discipline", books: [
            { title: "Atomic Habits", read: false },
            { title: "The Power of Discipline", read: true },
            { title: "The 12 Week Year", read: true },
            { title: "Getting Things Done", read: false }, { title: "Finish What You Start", read: false },
            { title: "Do It Today", read: false }, { title: "Deep Work", read: false },
            { title: "Hyperfocus", read: false }, { title: "The 5 AM Club", read: false },
            { title: "The Miracle Morning", read: false }, { title: "The Compound Effect", read: false },
            { title: "The Practicing Mind", read: false }
          ]},
          { name: "Communication & Social Skills", books: [
            { title: "How to Win Friends and Influence People", read: true },
            { title: "How to Talk to Anyone", read: true },
            { title: "Read People Like a Book", read: true },
            { title: "The Art of Public Speaking", read: true },
            { title: "Talk Like TED", read: false }, { title: "Crucial Conversations", read: false },
            { title: "You're Not Listening", read: false }, { title: "The Culture Map", read: false }
          ]},
          { name: "Sales & Marketing", books: [
            { title: "To Sell Is Human", read: false }, { title: "Sell to Big Companies", read: false },
            { title: "SPIN Selling", read: false }, { title: "Pitch Anything", read: false },
            { title: "The Psychology of Selling", read: false }, { title: "Made to Stick", read: false },
            { title: "The Sales Acceleration Formula", read: false },
            { title: "Mastering the Complex Sale", read: false }, { title: "How to Sell Anything", read: false }
          ]},
          { name: "Trading & Investing", books: [
            { title: "The Intelligent Investor", read: false }, { title: "Market Wizards", read: false },
            { title: "The Disciplined Trader", read: false }, { title: "High Probability Trading", read: false },
            { title: "The Art of Trading", read: false }
          ]},
          { name: "Philosophy & Deep Thinking", books: [
            { title: "Being and Nothingness", read: false }, { title: "The Law of Human Nature", read: false },
            { title: "Range", read: false }
          ]},
          { name: "Habits, Emotions & Inner Work", books: [
            { title: "Emotional Intelligence", read: true },
            { title: "The Power of Positive Thinking", read: true },
            { title: "The Power of Subconscious Mind", read: true },
            { title: "The Power of No", read: true },
            { title: "Master Your Emotions", read: false },
            { title: "Surrounded by Idiots", read: false }
          ]}
        ];
