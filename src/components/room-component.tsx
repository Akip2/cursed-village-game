import RoomData from "@/data/room-data";
import {Card, CardTitle} from "@/components/ui/card";
import Image from "next/image";
import {getRoleImageLink} from "@/data/question/role/role-factory";
import {Button} from "@/components/ui/button";
import {socket} from "@/data/socket";
import {usePlayer} from "@/context/player-provider";
import {useLoading} from "@/context/loading-provider";
import React, {useRef} from "react";
import {Loader2} from "lucide-react";

export default function RoomComponent(props: { room: RoomData, roomCallback: (status: boolean, room?: RoomData) => void }) {
    const {room, roomCallback} = props;
    const {players, gameMaster, roles, id} = room;
    const {playerName} = usePlayer();
    const {isLoading, setIsLoading, clickedButton, setClickedButton} = useLoading();

    const joinButtonRef = useRef<HTMLButtonElement>(null);

    const joinHandler = () => {
        setIsLoading(true);
        setClickedButton(joinButtonRef);
        socket.emit("join", id, playerName, roomCallback);
    }

    return (
        <Card className="w-full bg-gray-800 border-yellow-600 text-white shadow-md hover:shadow-yellow-500/30 transition-shadow duration-200 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col justify-center flex-1">
                    <CardTitle className="text-yellow-300 text-md truncate">{`${gameMaster.name}'s game`}</CardTitle>
                    <p className="text-sm text-yellow-100 opacity-80">
                        {players.length}/{roles.length} players
                    </p>
                </div>

                <div className="flex flex-1 gap-2 min-w-[184px] overflow-hidden justify-center">
                    {roles.slice(0, 4).map((role, index) => (
                        <Image
                            key={index}
                            src={getRoleImageLink(role)}
                            alt={`Role ${index + 1}`}
                            width={40}
                            height={40}
                        />
                    ))}
                </div>

                <div className="flex flex-1 justify-end">
                    <Button onClick={joinHandler} ref={joinButtonRef} disabled={isLoading} className="bg-yellow-600 hover:bg-yellow-500 text-black text-sm px-4 py-1 h-auto">
                        {clickedButton === joinButtonRef ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "Join"
                        )}
                    </Button>
                </div>
            </div>
        </Card>
    );
}