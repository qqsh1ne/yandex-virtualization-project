export interface Park {
    id: number,
    title?: string,
    poster_path?: string,
    vote_count?: number,
    vote_average?: number,
    overview?: string,
}

export interface ApiError {
    message: string
}

export interface Vote {
    id?: string,
    user_id: string,
    park_id: number,
    value: number
}
