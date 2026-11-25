import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(error:unknown,host:ArgumentsHost) {
    const ctx=host.switchToHttp(),res=ctx.getResponse<Response>();
    const dbError=error as any;
    const status=error instanceof HttpException?error.getStatus():dbError?.code==='ER_DUP_ENTRY'?HttpStatus.CONFLICT:(dbError?.code==='ER_ROW_IS_REFERENCED_2'||dbError?.code==='ER_NO_REFERENCED_ROW_2')?HttpStatus.CONFLICT:HttpStatus.INTERNAL_SERVER_ERROR;
    const response=error instanceof HttpException?error.getResponse():status===HttpStatus.CONFLICT?{message:'A conflicting or duplicate record prevented this operation.'}:null;
    const raw=typeof response==='object'&&response!==null?(response as any).message:response;
    const errors=Array.isArray(raw)?raw.map(String):raw?[String(raw)]:['Unexpected server error.'];
    const message=status>=500?'Unexpected server error.':(typeof raw==='string'?raw:errors[0]);
    res.status(status).json({success:false,statusCode:status,message,errors,timestamp:new Date().toISOString()});
  }
}
