# Year-end check of the 2025 archive

Tomás, typed up from memory on my laptop.

1. Go to the data folder:

   ```
   cd ~/jobs/terminal-practice-kit/data
   ```

2. Use the year-end limit:

   ```
   export ORDERS_LIMIT=300
   ```

3. Confirm the limit. It should say 300.00:

   ```
   oc --settings
   ```

4. Run the check:

   ```
   node ../check-orders.mjs archive/orders\ 2025.csv
   ```

   Expected: `Result: 3 orders checked, 2 in order, 1 with a problem.`

5. If it prints the Result line, the year is closed.
