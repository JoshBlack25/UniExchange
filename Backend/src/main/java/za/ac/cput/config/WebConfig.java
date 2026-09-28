/*
 WebConfig.java

 Exposes the uploads directory (see UploadController) at /uploads/** so a
 saved file is reachable over plain HTTP by the URL the upload endpoint hands
 back. Without this, files land on disk but 404 when the browser tries to
 load them.

 Files are served with the type of their extension, and LocalFileStorage only
 ever writes an extension detected from the file's real bytes. Every response
 here also carries X-Content-Type-Options: nosniff and the API CSP from
 SecurityConfig (the security filter chain covers /uploads/** too), and
 Content-Disposition: inline from the interceptor below - so an upload is only
 ever rendered as the image it is, never sniffed into HTML or a download.

 Author: Aidan Barends 230255639
 Date: 18 September 2026
*/

package za.ac.cput.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String uploadsDir;

    public WebConfig(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "inline");
                return true;
            }
        }).addPathPatterns("/uploads/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(this.uploadsDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }

}
