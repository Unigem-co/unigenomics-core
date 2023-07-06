export const schemaQuery = (table) => `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${table}'
    ORDER BY ordinal_position
`;

export const readableDate = date => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1 > 9 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`;
    const day = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`;

    return `${year}-${month}-${day}`
}