# Monthly order check

Dana's notes, written quickly on her last day before leave. "It all works on my machine."

1. Go to the kit:

   ```
   cd C:\Users\dana\work\terminal-practice-kit
   ```

2. Check this month's orders:

   ```
   ordercheck orders-2026-11.csv
   ```

   You should see: `Result: 7 orders checked, 5 in order, 2 with a problem.`

3. Check the old archive file too:

   ```
   node check-orders.mjs data\archive\orders 2025.csv
   ```

4. Save the report for the accountant:

   ```
   node check-orders.mjs data\orders-2026-11.csv > report.txt
   ```

   If no error shows up on the screen, everything is fine.
