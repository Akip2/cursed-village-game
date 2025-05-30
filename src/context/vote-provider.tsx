'use client'

import React, {createContext, useContext, useState} from 'react';
import PlayerData from "@/data/player-data";

const VoteContext = createContext<{
    votes: Map<string, PlayerData[]>;

    addVote: (voted: string, voter: PlayerData) => void;
    removeVote: (voted: string, voter: PlayerData) => void;
    clearVotes: () => void;
}>(null!);

export const VoteProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [votes, setVotes] = useState<Map<string, PlayerData[]>>(new Map());

    function addVote(voted:string, voter: PlayerData) {
        setVotes((prevVotes) => {
            const newVotes = new Map(prevVotes); // cloning previous map

            const existingVotes = newVotes.get(voted) || [];
            newVotes.set(voted, [...existingVotes, voter]);

            return newVotes;
        });
    }

    function removeVote(voted:string, voter: PlayerData) {
        setVotes((prevVotes) => {
            const newVotes = new Map(prevVotes); // cloning previous map

            const existingVotes = newVotes.get(voted) || [];
            const newExistingVotes = existingVotes.filter((v: PlayerData) => v.color !== voter.color);

            if(newExistingVotes.length > 0) {
                newVotes.set(voted, newExistingVotes);
            } else {
                newVotes.delete(voted);
            }

            return newVotes;
        });
    }

    function clearVotes() {
        setVotes(new Map());
    }

    return (
        <VoteContext.Provider value={{votes, addVote, removeVote, clearVotes}}>
            {children}
        </VoteContext.Provider>
    );
};


export const useVote = () => useContext(VoteContext);