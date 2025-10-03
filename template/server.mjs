import Router from './lib/router.mjs';
import { routes } from './worker/index.mjs';

const router = Router.create(routes);

function dispatchResponse(resp, status = 200) {
  const respType = typeof resp;

  if (respType === 'object' && resp !== null || respType === 'boolean' || respType === 'number') {
    let json;
    try {
      json = JSON.stringify(resp);
    } catch (err) {
      return Router.internalServerErrorResponse('Error when encoding response: ' + err.message);
    }

    return new Response(json, {
      status: status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } else if (respType === 'string') {
    const contentType = resp.startsWith('<')
      ? 'text/html; charset=utf-8'
      : 'text/plain; charset=utf-8';

    return new Response(resp, {
      status: status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
      }
    });
  } else {
    return Router.internalServerErrorResponse(`Invalid response type: ${respType}`);
  }
}


export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      const { handler, params } = router.match(path, method);
      const result = await handler(request, env, ctx);

      if (result instanceof Response) {
        return result;
      }

      return dispatchResponse(result, 200);

    } catch (error) {
      if (error instanceof Router.NotFoundError) {
        return Router.notFoundResponse(error.message);
      } else if (error instanceof Router.MethodNotAllowedError) {
        return Router.methodNotAllowedResponse(request);
      } else {
        return Router.internalServerErrorResponse(error.message);
      }
    }
  }
};