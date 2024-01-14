import { Pool } from "pg";

export class PostgressRepository {
    pool;
    constructor() {
        this.pool = new Pool({
            host: process.env.PGHOST,
            user: process.env.PGUSER,
            database: process.env.PGDATABASE,
            password: process.env.PGPASSWORD,
            port: parseInt(process.env.PGPORT),
            ssl: { rejectUnauthorized: false },
        });
    }
    async query(query, values) {
        try {
            const response = await this.pool.query(query, values);
            return response;
        } catch(error) {
            throw error;
        }        
    }
}