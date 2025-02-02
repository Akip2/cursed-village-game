'use client'

import Chat from "../../components/game/chat";
import PlayerContainer from "../../components/game/player-container";
import {socket} from "@/data/socket";
import React, {useEffect} from "react";
import {useGame} from "@/context/game-provider";
import PlayerData from "@/data/player-data";
import {usePlayer} from "@/context/player-provider";

export default function GamePage() {
    const {roles, setRoles, players, setPlayers, phase, setPhase, setPhaseEndTime} = useGame();
    const {setRole, setColor} = usePlayer();

    useEffect(() => {
        socket.emit("get-room-data");

        socket.on("room-data", receiveRoomData);
        socket.on("player-join", playerJoin);
        socket.on("player-leave", playerLeave);
        socket.on("phase-change", phaseChange);
        socket.on("role", receiveRole);

        return () => {
            socket.off("room-data", receiveRoomData);
            socket.off("player-join", playerJoin);
            socket.off("player-leave", playerLeave);
            socket.off("phase-change", phaseChange);
            socket.off("role", receiveRole);
        }
    }, []);

    useEffect(() => {
        if (phase === "Starting" && players.length < roles.length) {
            setPhase("Waiting");
        }
    }, [players, roles]);

    const receiveRoomData = (data: { players: PlayerData[], roles: string[], phase: string }) => {
        setPlayers(data.players);
        setRoles(data.roles);
        setPhase(data.phase);

        let playerInfo = data.players[data.players.length - 1];
        setColor(playerInfo.color);

        if (data.phase === "Starting") {
            startingGame();
        }
    }

    const playerJoin = (player: PlayerData) => {
        setPlayers((prevPlayers) => [...prevPlayers, player]);

        if (players.length == roles.length) {
            startingGame();
        }
    }

    const playerLeave = (player: PlayerData) => {
        setPlayers((prevPlayers) => prevPlayers.filter((p) => p.color !== player.color));
    }

    const phaseChange = (newPhase: { name: string, duration: number }) => {
        setPhaseEndTime(Date.now() + newPhase.duration * 1000);
        setPhase(newPhase.name);
    }

    const startingGame = () => {
        setPhase("Starting");
        setPhaseEndTime(Date.now() + 10000);
    }

    const receiveRole = (role: string) => {
        setRole(role);
    }

    return (
        <div className="flex flex-row w-screen h-screen text-white">
            <Chat/>
            <PlayerContainer/>
        </div>
    );
}