import {
    BatchWriteItemCommand,
    BatchWriteItemInput,
    DeleteItemCommand,
    DeleteItemCommandInput,
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandInput,
    GetItemCommandOutput,
    PutItemCommand,
    PutItemCommandInput,
    QueryCommand,
    QueryCommandInput,
    QueryCommandOutput,
    UpdateItemCommand,
    UpdateItemCommandInput,
    WriteRequest
} from "@aws-sdk/client-dynamodb";
import {marshall, unmarshall} from "@aws-sdk/util-dynamodb";
import {ApiError, Park, Vote} from "./model";
import {SdkError} from "@aws-sdk/types";
import {getIamToken, Token} from "./iam";
import {HttpRequest} from "@aws-sdk/protocol-http";

const PARKS_TABLE = "parks";
const VOTES_TABLE = "votes";
const MAX_LIMIT = 100;

const ddbClient = new DynamoDBClient({
    region: "ru-central-1-a",
    endpoint: process.env.DOCUMENT_API_ENDPOINT
});

export async function savePark(park: Park): Promise<Park | ApiError> {
    const params: UpdateItemCommandInput = {
        TableName: PARKS_TABLE,
        Key: {
            "id": {
                "N": park.id.toString()
            }
        },
        UpdateExpression: "SET " +
            "title = :title, " +
            "poster_path = :poster_path," +
            "vote_count = :vote_count, " +
            "vote_average = :vote_average, " +
            "type = :type, " +
            "overview = :overview",
        ExpressionAttributeValues: {
            ":title": {"S": park.title || ""},
            ":poster_path": {"S": park.poster_path || ""},
            ":vote_count": {"N": park.vote_count?.toString() || "0"},
            ":vote_average": {"N": park.vote_average?.toString() || "0"},
            ":type": {"S": park.type || ""},
            ":overview": {"S": park.overview || ""},
        }
    };

    console.debug("Save park...");
    try {
        await callWithToken(() => ddbClient.send(new UpdateItemCommand(params)));
        console.debug(`Save park id=${park.id}, title=${park.title}`);
        return park;
    } catch (e) {
        console.error("Failed to save park: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function batchWriteParks(parks: Park[]): Promise<number | ApiError> {
    const requests: WriteRequest[] = parks.map(park => {
        return {
            PutRequest: {
                Item: marshall(park)
            }
        } as WriteRequest
    });

    const params: BatchWriteItemInput = {
        RequestItems: {
            "parks": requests
        }
    };

    try {
        await callWithToken(() => ddbClient.send(new BatchWriteItemCommand(params)));
        console.debug(`Wrote ${parks.length} parks`);
        return parks.length;
    } catch (e) {
        console.error("Failed to write parks: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getParkById(id: number): Promise<Park | undefined | ApiError> {
    const params: GetItemCommandInput = {
        TableName: PARKS_TABLE,
        Key: marshall({"id": id}),

    };

    try {
        const result: GetItemCommandOutput = await callWithToken(() => ddbClient.send(new GetItemCommand(params)));
        return result.Item ? unmarshall(result.Item) as Park : undefined;
    } catch (e) {
        console.error(e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function deleteParkById(id: number): Promise<number | ApiError> {
    const params: DeleteItemCommandInput = {
        TableName: PARKS_TABLE,
        Key: marshall({"id": id})
    };

    try {
        await callWithToken(() => ddbClient.send(new DeleteItemCommand(params)));
        console.debug(`Deleted park id=${id}.`);
        return id;
    } catch (e) {
        console.error(`Failed to delete park id=${id}: `, e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getParks(limit?: number): Promise<Park[] | ApiError> {
    const params: QueryCommandInput = {
        TableName: PARKS_TABLE,
        Limit: !limit || (limit > MAX_LIMIT) ? MAX_LIMIT : limit,
        IndexName: "VoteCountIndex",
        KeyConditionExpression: "#t = :type AND #p > :vote_count",
        ExpressionAttributeNames: {"#t": "type", "#p": "vote_count"},
        ExpressionAttributeValues: {
            ":type": {
                S: "park"
            },
            ":vote_count": {
                N: "0"
            }
        },
        ScanIndexForward: false
    };

    try {
        const result: QueryCommandOutput = await callWithToken(() => ddbClient.send(new QueryCommand(params)));
        return result.Items ? result.Items.map(value => unmarshall(value) as Park) : [];
    } catch (e) {
        console.error("Failed to get parks: ", e);
        return {message: '(e as SdkError).message'} as ApiError;
    }
}

export async function putVote(vote: Vote): Promise<Vote | ApiError> {
    const item = marshall(vote);
    const params: PutItemCommandInput = {
        TableName: VOTES_TABLE,
        Item: item
    };

    console.debug("Adding a new vote...");
    try {
        await callWithToken(() => ddbClient.send(new PutItemCommand(params)));
        console.debug(`Added new vote with user_id=${vote.user_id}, park_id=${vote.park_id}, value=${vote.value}`);
        return vote;
    } catch (e) {
        console.error("Failed to add new vote: ", e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getVote(userId: string, parkId: number): Promise<Vote | undefined | ApiError> {
    const params: GetItemCommandInput = {
        TableName: VOTES_TABLE,
        Key: marshall({"id": userId + "#" + parkId}),

    };

    try {
        const result: GetItemCommandOutput = await callWithToken(() => ddbClient.send(new GetItemCommand(params)));
        return result.Item ? unmarshall(result.Item) as Vote : undefined;
    } catch (e) {
        console.error(e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

export async function getVotes(parkId: number): Promise<Vote[] | ApiError> {
    const params: QueryCommandInput = {
        TableName: VOTES_TABLE,
        IndexName: "ParkIndex",
        KeyConditionExpression: "#m = :park_id",
        ExpressionAttributeNames: {"#m": "park_id"},
        ExpressionAttributeValues: {
            ":park_id": {
                N: parkId.toString()
            }
        }
    };

    try {
        console.error(`Get votes for park ${parkId} ...`);
        const result: QueryCommandOutput = await callWithToken(() => ddbClient.send(new QueryCommand(params)));
        return result.Items ? result.Items.map(value => unmarshall(value) as Vote) : [];
    } catch (e) {
        console.error(`Failed to get votes for park ${parkId}: `, e);
        return {message: (e as SdkError).message} as ApiError;
    }
}

function callWithToken(operation: () => Promise<any>): Promise<any> {
    ddbClient.middlewareStack.add(
        (next) => async (arguments_) => {
            const request = arguments_.request as HttpRequest;
            const token: Token = await getIamToken();
            request.headers["Authorization"] = "Bearer " + token.access_token;
            return next(arguments_);
        },
        {
            step: "finalizeRequest",
        }
    );
    return operation.apply({});
}
