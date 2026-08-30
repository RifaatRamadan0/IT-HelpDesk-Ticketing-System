using HelpDesk.BLL.Interfaces;
using HelpDesk.BLL.Services;
using HelpDesk.DAL.Data;
using HelpDesk.DAL.Interfaces;
using HelpDesk.DAL.Repositories;
using HelpDesk.Integrations.OpenAI;
using HelpDesk_API.Hubs;
using HelpDesk_API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

namespace HelpDesk_API
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers();
            builder.Services.AddSignalR();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                var jwtScheme = new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Paste ONLY the access token (no \"Bearer \" prefix)."
                };

                options.AddSecurityDefinition("Bearer", jwtScheme);

                options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(
                    builder.Configuration.GetConnectionString("DefaultConnection"),
                    sql => sql.EnableRetryOnFailure(
                        maxRetryCount: 10,
                        maxRetryDelay: TimeSpan.FromSeconds(20),
                        errorNumbersToAdd: null)));

            const string FrontendCorsPolicy = "FrontendCorsPolicy";

            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

            builder.Services.AddCors(options =>
            {
                options.AddPolicy(FrontendCorsPolicy, policy =>
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .WithExposedHeaders("Location")
                          .AllowCredentials();
                });
            });

            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
            builder.Services.AddScoped<ITicketRepository, TicketRepository>();
            builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
            builder.Services.AddScoped<IPriorityRepository, PriorityRepository>();
            builder.Services.AddScoped<IRoleRepository, RoleRepository>();
            builder.Services.AddScoped<ITicketCommentRepository, TicketCommentRepository>();
            builder.Services.AddScoped<IActivityLogRepository, ActivityLogRepository>();
            builder.Services.AddScoped<IAttachmentRepository, AttachmentRepository>();
            builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<ITokenService, TokenService>();
            builder.Services.AddScoped<ITicketService, TicketService>();
            builder.Services.AddScoped<ICategoryService, CategoryService>();
            builder.Services.AddScoped<IPriorityService, PriorityService>();
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<IRoleService, RoleService>();
            builder.Services.AddScoped<ITicketCommentService, TicketCommentService>();
            builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
            builder.Services.AddScoped<IAttachmentService, AttachmentService>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<INotificationRealtime, NotificationRealtime>();
            builder.Services.AddScoped<IFileStorageService, HelpDesk_API.Services.FileStorageService>();

            builder.Services.AddScoped<IAiSuggestionService, AiSuggestionService>();
            builder.Services.AddScoped<IAiChatService, AiChatService>();
            builder.Services.AddScoped<IReportPdfGenerator, ReportPdfGenerator>();

            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            builder.Services.AddAutoMapper(cfg =>
                cfg.AddMaps(typeof(HelpDesk.BLL.Mapping.MappingProfile).Assembly));

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

            var app = builder.Build();

            _ = Task.Run(async () =>
            {
                using var scope = app.Services.CreateScope();
                var logger = app.Services.GetRequiredService<ILogger<Program>>();

                try
                {
                    await scope.ServiceProvider.GetRequiredService<AppDbContext>()
                               .Database.MigrateAsync();
                    logger.LogInformation("Startup migration complete.");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Startup migration failed.");
                }
            });

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseCors(FrontendCorsPolicy);

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapGet("/wake", () => Results.Ok(new { status = "awake" }))
               .AllowAnonymous();

            app.MapControllers();
            app.MapHub<NotificationHub>("/hubs/notifications");

            app.Run();
        }
    }
}
