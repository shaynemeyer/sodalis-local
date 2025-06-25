async function fetchItems() {
  const response = await fetch("https://api.example.com/items");

  const data = await response.json();

  console.log(data);
}

await fetchItems();

