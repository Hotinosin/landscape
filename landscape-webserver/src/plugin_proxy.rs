use std::path::Path;

use axum::{
    body::Body,
    http::{Request, StatusCode, header},
    response::{IntoResponse, Response},
};
use http_body_util::BodyExt;
use hyper::client::conn::http1;
use hyper_util::rt::TokioIo;
use tokio::net::UnixStream;

pub async fn proxy_unix(mut request: Request<Body>, socket: &Path, path: &str) -> Response {
    let downstream_upgrade =
        request.headers().contains_key(header::UPGRADE).then(|| hyper::upgrade::on(&mut request));
    let stream = match UnixStream::connect(socket).await {
        Ok(stream) => stream,
        Err(_) => {
            return (StatusCode::BAD_GATEWAY, "plugin controller is unavailable").into_response();
        }
    };
    let (mut sender, connection) = match http1::handshake(TokioIo::new(stream)).await {
        Ok(parts) => parts,
        Err(_) => {
            return (StatusCode::BAD_GATEWAY, "plugin controller handshake failed").into_response();
        }
    };
    tokio::spawn(async move {
        let _ = connection.with_upgrades().await;
    });

    let query = request.uri().query().map(|q| format!("?{q}")).unwrap_or_default();
    let Ok(uri) = format!("{path}{query}").parse() else {
        return (StatusCode::BAD_REQUEST, "invalid plugin path").into_response();
    };
    *request.uri_mut() = uri;
    request.headers_mut().insert(header::HOST, "localhost".parse().unwrap());
    request.headers_mut().remove(header::COOKIE);
    request.headers_mut().remove(header::AUTHORIZATION);
    request.headers_mut().remove(header::ORIGIN);

    match sender.send_request(request).await {
        Ok(mut response) => {
            if response.status() == StatusCode::SWITCHING_PROTOCOLS {
                if let Some(downstream_upgrade) = downstream_upgrade {
                    let upstream_upgrade = hyper::upgrade::on(&mut response);
                    tokio::spawn(async move {
                        let (Ok(downstream), Ok(upstream)) =
                            (downstream_upgrade.await, upstream_upgrade.await)
                        else {
                            return;
                        };
                        let mut downstream = TokioIo::new(downstream);
                        let mut upstream = TokioIo::new(upstream);
                        let _ = tokio::io::copy_bidirectional(&mut downstream, &mut upstream).await;
                    });
                }
            }
            let (parts, body) = response.into_parts();
            Response::from_parts(parts, Body::new(body.map_err(std::io::Error::other)))
        }
        Err(_) => (StatusCode::BAD_GATEWAY, "plugin controller request failed").into_response(),
    }
}
