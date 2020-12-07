import { NextFunction, Request, Response } from "express";
import { ErrorResponse } from "../utils/ErrorResponse";

export const errorHandler = ( err: ErrorResponse, _: Request, res: Response, next: NextFunction ) =>
{
    res.status( err.statusCode ).json( { success: false, error: err.message } );
    res.end();
    next();
};