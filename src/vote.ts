import {getParkById, getVotes, putVote} from "./repository";
import {Vote} from "./model";

interface Event {
    messages: Vote[]
}

const ERROR = {
    "statusCode": 500,
    "body": 'Fail to put vote',
    "isBase64Encoded": false
};

export const handler = async (event: Event): Promise<any> => {
    try {
        const vote = event.messages[0];
        await putVote({
            id: vote.user_id + "#" + vote.park_id,
            user_id: vote.user_id,
            park_id: vote.park_id,
            value: vote.value
        } as Vote);

        const votes = await getVotes(vote.park_id);
        if ("message" in votes) {
            return ERROR;
        }
        console.debug(`Loaded ${votes.length} votes for park ${vote.park_id}`)

        const park = await getParkById(vote.park_id);
        if (!park || "message" in park) {
            return ERROR;
        }

        return {
            "statusCode": 200,
            "body": 'Put vote successfully',
            "isBase64Encoded": false
        };
    } catch (e) {
        console.error("Failed to put vote: ", e);
        return ERROR;
    }
}
