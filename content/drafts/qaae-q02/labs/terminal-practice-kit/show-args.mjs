// Shows exactly what a program receives from the shell.
//
// Run it from this folder with:   node show-args.mjs hello world
//
// It prints one numbered line for each argument, with square brackets around it so that you can
// see where each argument starts and ends. It reads no files and changes nothing.

const received = process.argv.slice(2);

console.log(`I received ${received.length} argument${received.length === 1 ? '' : 's'}.`);

received.forEach((argument, index) => {
  console.log(`  ${index + 1}: [${argument}]`);
});
