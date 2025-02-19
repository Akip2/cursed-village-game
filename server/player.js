export default class Player {
    constructor(id, n, c) {
        this.id = id;
        this.name = n;
        this.color = c;
        this.isAlive = true;
    }

    setRole(r) {
        this.role = r;
    }

    isRole(r) {
        return this.role === r;
    }

    serialize() {
        return {
            name: this.name,
            color: this.color,
            isAlive: this.isAlive,
        }
    }
}