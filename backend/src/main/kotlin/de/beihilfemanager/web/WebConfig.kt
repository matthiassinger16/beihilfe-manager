package de.beihilfemanager.web

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.resource.PathResourceResolver
import java.time.Clock

@Configuration
class WebConfig : WebMvcConfigurer {

    @Bean
    fun clock(): Clock = Clock.systemDefaultZone()

    /**
     * Serves the bundled Angular app. Unknown non-API paths fall back to index.html so that
     * client-side routes (e.g. /bills/42) survive a browser reload.
     */
    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry.addResourceHandler("/**")
            .addResourceLocations("classpath:/static/")
            .resourceChain(true)
            .addResolver(object : PathResourceResolver() {
                override fun getResource(resourcePath: String, location: Resource): Resource? {
                    val requested = location.createRelative(resourcePath)
                    if (requested.exists() && requested.isReadable) return requested
                    if (resourcePath.startsWith("api/")) return null
                    return ClassPathResource("/static/index.html").takeIf { it.exists() }
                }
            })
    }
}
