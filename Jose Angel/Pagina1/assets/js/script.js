document.addEventListener('DOMContentLoaded', function () {
    const img = document.getElementById('dkImg');
    const toggleBtn = document.getElementById('toggleBtn');
    const changeTextBtn = document.getElementById('changeTextBtn');
    const checkBtn = document.getElementById('checkBtn');
    const statusText = document.getElementById('statusText');
    if (!img || !toggleBtn || !changeTextBtn || !checkBtn || !statusText) return;

    const pokemons = [
        { id: 25, name: 'Pikachu' },
        { id: 1, name: 'Bulbasaur' },
        { id: 4, name: 'Charmander' }
    ];
    let current = 0;

    img.addEventListener('click', () => {
        img.style.display = 'none';
    });

    toggleBtn.addEventListener('click', toggleImg);
    changeTextBtn.addEventListener('click', cyclePokemon);
    checkBtn.addEventListener('click', usePokeBall);

    function cyclePokemon() {
        current = (current + 1) % pokemons.length;
        const p = pokemons[current];
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
        statusText.textContent = `Has cambiado a ${p.name}`;
    }

    function usePokeBall() {
        if (getComputedStyle(img).display === 'none') {
            statusText.textContent = 'Lanzaste la Poké Ball. ¡Se ha escapado!';
            img.style.display = '';
        } else {
            statusText.textContent = 'Lanzaste la Poké Ball. ¡Capturado!';
            img.style.display = 'none';
        }
    }

    function toggleImg() {
        img.style.display = getComputedStyle(img).display === 'none' ? '' : 'none';
    }
});
