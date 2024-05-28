import fetch from "node-fetch";
import {Park} from "./model";
import {savePark} from "./repository";
import {PutObjectCommand, PutObjectCommandInput, S3Client} from "@aws-sdk/client-s3";
import {getIamToken, Token} from "./iam";
import {HttpRequest} from "@aws-sdk/protocol-http";

const PARKS_COUNT = 5;

const s3Client = new S3Client({
    region: "ru-central1",
    endpoint: "https://storage.yandexcloud.net"
});

interface dbPark {
    id: number,
    title: string,
    poster_path: string,
    vote_count: number,
    vote_average: number,
    overview: string,
}

function transform(dbPark: dbPark): Park {
    return {
        id: dbPark.id,
        title: dbPark.title,
        poster_path: dbPark.poster_path,
        vote_average: dbPark.vote_average / 2,
        vote_count: dbPark.vote_count,
        overview: dbPark.overview,
    };
}

export const handler = async (event: any): Promise<any> => {
    // genres удалены
    const dbParks: dbPark[] = await (await fetch("https://storage.yandexcloud.net/project-parks-images/parks.json")).json() as dbPark[];

    for (let i = 0; i < PARKS_COUNT; i++) {
        let park = transform(dbParks[i]);
        await savePark(park)
        await importImage("posters", park.poster_path?.slice(1))
    }

    return {
        "statusCode": 200,
        "body": `Imported ${PARKS_COUNT} parks`,
        "isBase64Encoded": false
    }
}

async function importImage(folder: string, file: string | undefined) {
    if (!file) return;
    const uploadParams: PutObjectCommandInput = {
        Bucket: process.env.IMAGES_BUCKET_NAME,
        Key: `${folder}/${file}`,
        Body: await (await fetch(`https://storage.yandexcloud.net/project-parks-images/${file}`)).buffer() // Поменять
    };

    try {
        await callWithToken(() => s3Client.send(new PutObjectCommand(uploadParams)))
        console.log(`Imported image ${file}`)
    } catch (e) {
        console.error(`Failed to import image ${file}: `, e);
    }
}

function callWithToken(operation: () => Promise<any>): Promise<any> {
    s3Client.middlewareStack.add(
        (next) => async (arguments_) => {
            const request = arguments_.request as HttpRequest;
            const token: Token = await getIamToken();
            request.headers["X-YaCloud-SubjectToken"] = token.access_token;
            return next(arguments_);
        },
        {
            step: "finalizeRequest",
        }
    );
    return operation.apply({});
}
