import { Pool } from "pg";

export class PostgressRepository {
    pool;
    constructor() {
        this.pool = new Pool({
            host: process.env.PGHOST,
            user: process.env.PGUSER,
            database: process.env.PGDATABASE,
            password: process.env.PGPASSWORD,
            port: parseInt(process.env.PGPORT || '5432') ,
            ssl: process.env.NODE_ENV === 'development' ? { rejectUnauthorized: false } : true,
        });
    }
    async query(query, values) {
        const response = await this.pool.query(query, values);
        return response;
    }
}