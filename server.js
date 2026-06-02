    // ... imports ...
    // ... database logic ...
    
    // --- MODIFIED FUNCTION FOR VERCEL PERSISTENCE ---
    async function loadDB() {
        try {
            // 1. Try to read from Vercel persistent storage
            const path = path.join(__dirname, 'vercel.json');
            
            // Check if file exists to avoid "file not found" errors
            if (fs.existsSync(path)) {
                const data = fs.readFileSync(path, 'utf8');
                return JSON.parse(data);
            } else {
                // 2. If no file found, Initialize with default data
                const defaultPassword = 'admin123'; 
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                const initialData = { 
                    students: [], exams: [], finance: [], staff: [], inventory: [], 
                    trades: [], settings: { schoolName: "TVET Institute" },
                    users: [{ email: 'admin@tvet.ac.ke', passwordHash: hashedPassword, role: 'admin' }]
                };
                // Save the initial DB
                fs.writeFileSync(path, JSON.stringify(initialData), 'utf8');
                return initialData;
            }
        } catch (err) {
            // Handle corrupted JSON or other errors
            console.error("Error loading DB, initializing defaults:", err);
            const initialData = { students: [], exams: [], finance: [], staff: [], inventory: [], settings: {} };
            return initialData;
        }
    }

    async function saveDB(data) {
        const path = path.join(__dirname, 'vercel.json');
        try {
            // Write to Vercel persistent storage
            fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
        } catch (err) {
            console.error("Error saving DB:", err);
        }
    }