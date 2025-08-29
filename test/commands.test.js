const { equal, assert } = require('./helpers/assert');

async function run() {
  const commands = await import('../dist/editor/commands.js');

  // Mock document.execCommand
  const calls = [];
  global.document = global.document || {};
  global.document.execCommand = (cmd, _showUI, value) => { calls.push({ cmd, value }); return true; };

  // setAlignment
  commands.setAlignment('left');
  commands.setAlignment('center');
  commands.setAlignment('right');
  commands.setAlignment('justify');
  equal(calls[0].cmd, 'justifyLeft');
  equal(calls[1].cmd, 'justifyCenter');
  equal(calls[2].cmd, 'justifyRight');
  equal(calls[3].cmd, 'justifyFull');

  // execCommand
  commands.execCommand('bold');
  commands.execCommand('foreColor', '#ff0000');
  const last = calls[calls.length - 1];
  equal(last.cmd, 'foreColor');
  equal(last.value, '#ff0000');

  // handleShortcut
  let invoked = { b:false,i:false,u:false,k:false };
  function K(key){ return { key, metaKey: true, ctrlKey: false, preventDefault: () => { invoked.prevented = true; } }; }
  assert(commands.handleShortcut(K('b'), { bold:()=>{invoked.b=true;}, italic:()=>{}, underline:()=>{}, link:()=>{} }));
  assert(invoked.b);
  assert(commands.handleShortcut(K('i'), { bold:()=>{}, italic:()=>{invoked.i=true;}, underline:()=>{}, link:()=>{} }));
  assert(invoked.i);
  assert(commands.handleShortcut(K('u'), { bold:()=>{}, italic:()=>{}, underline:()=>{invoked.u=true;}, link:()=>{} }));
  assert(invoked.u);
  assert(commands.handleShortcut(K('k'), { bold:()=>{}, italic:()=>{}, underline:()=>{}, link:()=>{invoked.k=true;} }));
  assert(invoked.k);

  console.log('commands.test.js: OK');
}

run().catch((err) => { console.error(err); process.exit(1); });

