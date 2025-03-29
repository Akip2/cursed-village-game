import Player from "./player.js";
import {setTimeout} from "node:timers";
import Game from "./game.js";
import PriestPhase from "./phases/cyclic/priest-phase.js";
import GolemPhase from "./phases/cyclic/golem-phase.js";
import WraithPhase from "./phases/cyclic/wraith-phase.js";
import MorningPhase from "./phases/cyclic/morning-phase.js";
import StartingPhase from "./phases/non-cyclic/starting-phase.js";
import WaitingPhase from "./phases/non-cyclic/waiting-phase.js";
import RolePhase from "./phases/non-cyclic/role-phase.js";

const possibleColors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "brown", "black", "white"];
const defaultRoles = ["priest", "wraith", "wraith", "golem", "slave"];
//const phases = ["Golem", "Priest", "Temple", "Wraith", "Morning", "Vote", "Judge"]

export default class Room {
    constructor(io, id, roles = [...defaultRoles]) {
        this.io = io;
        this.id = id;

        this.game = new Game();

        this.roles = roles;
        this.players = [];
        this.remainingColors = [...possibleColors];

        this.activePlayersIds = []; //Array containing the id(s) of player(s) doing an action during this phase

        this.started = false;

        /** @type {Phase} */
        this.currentPhase = new WaitingPhase();
        this.phaseIndex = -1;
        this.phases = [
            new GolemPhase(this),
            new PriestPhase(this, this.game),
            new WraithPhase(this),
            new MorningPhase(this, this.game)
        ]

        this.timer = null;
    }

    isFree() {
        return (!this.started && this.getNbPlayers() < this.roles.length);
    }

    hasPlayer(playerId) {
        return !!this.players.find(player => player.id === playerId);
    }

    getNbPlayers() {
        let socketRoom = this.io.sockets.adapter.rooms.get(this.id);
        return socketRoom ? socketRoom.size : 0;
    }

    isEmpty() {
        return this.io.sockets.adapter.rooms.get(this.id) === undefined;
    }

    getFreeColor() {
        const randomIndex = Math.floor(Math.random() * this.remainingColors.length);
        return this.remainingColors.splice(randomIndex, 1)[0];
    }

    addPlayer(socket, playerName) {
        let player = new Player(socket.id, playerName, this.getFreeColor());
        this.players.push(player);

        this.io.to(this.id).emit("player-join", player.serialize());
        socket.join(this.id);

        if (this.players.length === this.roles.length) {
            this.currentPhase = new StartingPhase();

            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.startGame(), this.currentPhase.duration * 1000);
        }
    }

    startGame() {
        if (this.players.length === this.roles.length) {
            this.started = true;
            this.currentPhase = new RolePhase(this);
            this.currentPhase.execute();

            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.nextPhase(), this.currentPhase.duration * 1000);
        }
    }

    /**
     * Handles player disconnection
     * If the game hasn't started, the player is removed from the room
     * @param playerId
     */
    disconnectPlayer(playerId) {
        let player = this.players.find(player => player.id === playerId);

        if (this.started) {

        } else {
            if (this.currentPhase.name === "Starting") {
                this.currentPhase = new WaitingPhase();
                clearTimeout(this.timer);
            }

            this.remainingColors.push(player.color);
            this.players.splice(this.players.indexOf(player), 1);
            this.io.to(this.id).emit("player-leave", player.serialize());
        }
    }

    /**
     * Passes the game to its next phase
     * If a phase requirements are not met it is skipped
     */
    nextPhase() {
        clearTimeout(this.timer);

        this.activePlayersIds.forEach((id) => {
            this.send("stop-action", {}, id);
        })
        this.activePlayersIds = [];

        this.phaseIndex++;
        if (this.phaseIndex >= this.phases.length) {
            this.phaseIndex = 0;
        }

        this.currentPhase = this.phases[this.phaseIndex];

        if(this.currentPhase.isValid()) {
            this.currentPhase.execute();
        }
    }

    startPhaseTimer(time) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.nextPhase(), time * 1000);
    }

    kill(victimColor, reason) {
        const victim = this.getPlayerByColor(victimColor);
        victim.die();


        this.send("death", {
            reason: reason,
            victim: victim
        })
    }

    getPlayerByRole(role) {
        return this.players.find(player => player.isRole(role));
    }

    getPlayerByColor(color) {
        return this.players.find(player => player.color === color);
    }

    getPlayerById(id) {
        return this.players.find(player => player.id === id);
    }

    addActivePlayerId(playerId) {
        this.activePlayersIds.push(playerId);
    }

    /**
     * Returns every wraith players that are still alive
     * @returns {*} array containing all wraith players that are still alive
     */
    getWraiths() {
        return this.players.filter(player =>
            player.isRole("wraith")
            &&
            player.isAlive
        );
    }

    /**
     * Activates the power of a player
     * @param player player we are activating the power of
     * @param selectNb number of players that the player doing the action has to select
     */
    playerAction(player, selectNb = 1) {
        this.send("action", {actionName: player.role, selectNb: selectNb}, player.id);
    }

    /**
     * Sends requests to allow players to vote
     * @param players array of players allowed to vote
     */
    allowVote(players) {
        players.forEach((player) => {
            this.send("action", {actionName: "vote", selectNb: 1}, player.id);
            this.activePlayersIds.push(player.id);
        })
    }

    /**
     * Executes the action of a player's role
     * @param selectedPlayers players selected by the action
     */
    executeAction(selectedPlayers) {
        this.game.usePower(this.currentPhase.name.toLowerCase(), selectedPlayers);
        this.nextPhase();
    }

    vote(voteData, voterSocket) {
        const unvoted = voteData["unvoted"];
        const voted = voteData["voted"];

        if(unvoted != null) {
            this.game.unvote(unvoted); //remove previous vote
        }
        if(voted != null) {
            this.game.vote(voted);
        }

        const voter = this.getPlayerById(voterSocket.id);

        const updateData = {
            voter: voter.serialize(),
            unvoted: unvoted,
            voted: voted
        };

        if(this.currentPhase.name !== "Wraith") { //Village vote, we send the vote to everyone
            this.send("vote-update", updateData, this.id, voterSocket);
        } else {
            const otherWraithsIds = this.activePlayersIds.filter(playerId => playerId !== voterSocket.id);
            otherWraithsIds.forEach((playerId) => {
                this.send("vote-update", updateData, playerId);
            })
        }
    }

    /**
     * Sends a request to one or multiple players
     * @param requestName name of the request
     * @param data content of the request
     * @param receiver id of the receiving socket/room
     * @param emitter socket of the author of the event (a player socket or the server)
     */
    send(requestName, data = {}, receiver = this.id, emitter = this.io) {
        emitter.to(receiver).emit(requestName, data);
    }

    serialize() {
        return {
            players: this.players.map(player => player.serialize()),
            roles: this.roles,
            phase: this.currentPhase.name
        }
    }
}