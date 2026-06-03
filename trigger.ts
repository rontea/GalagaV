import fetch from 'node-fetch'; // No, fetch is global in node 18+
async function main() {
  const result = await fetch('http://127.0.0.1:3000/api/syncfromfiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ todoFolderPath: 'todo', localFolderPath: '' })
  });
  console.log(await result.json());
}
main();
