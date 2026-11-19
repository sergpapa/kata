// Shows the value of the environment variables you name, as this program was handed them.
//
// Run it from this folder with:   node show-env.mjs ORDERS_LIMIT
//
// It prints only the variables you ask for by name. It never prints the whole environment,
// because an environment can hold passwords and keys. It reads no files and changes nothing.

const names = process.argv.slice(2);

if (names.length === 0) {
  const count = Object.keys(process.env).length;
  console.log(`This program was handed ${count} environment variables when it started.`);
  console.log('Name the ones you want to see, for example: node show-env.mjs ORDERS_LIMIT');
} else {
  for (const name of names) {
    const value = process.env[name];
    console.log(value === undefined ? `${name} is not set` : `${name} = [${value}]`);
  }
}
