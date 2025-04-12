'use client'

import PlayerData from "@/data/player-data";

export default function VoteContainer(props: { voters: PlayerData[] }) {
    const voters = props.voters;
    return (
        <div className="flex flex-row items-center justify-around w-full h-8">
            {voters.map((voter, index) => (
                <div key={index} className="rounded-2xl w-8 h-full border-white border-4" style={{backgroundColor: voter.color}}></div>
            ))}
        </div>
    )
}