using AutoMapper;
using HelpDesk.BLL.Common;
using HelpDesk.BLL.DTOs;
using HelpDesk.BLL.Interfaces;
using HelpDesk.DAL.Interfaces;
using HelpDesk.Domain.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HelpDesk.BLL.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;

        public UserService(IUserRepository userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<ICollection<UserListItemDto>> GetAllAsync()
        {
            var users = await _userRepository.GetAllAsync();
            return _mapper.Map<List<UserListItemDto>>(users);
        }

        public async Task<int?> CreateAsync(CreateUserRequestDto request, int createdByUserId)
        {
            if (await _userRepository.EmailExistsAsync(request.Email))
                return null;

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                RoleId = request.RoleId,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                CreatedByUserId = createdByUserId
            };

            return await _userRepository.CreateAsync(user);
        }

        public async Task<bool> UpdateAsync(int id, UpdateUserRequestDto request)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                return false;

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.RoleId = request.RoleId;
            user.IsActive = request.IsActive;

            return await _userRepository.UpdateAsync(user);
        }

        public async Task<DeleteUserResult> DeleteAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                return DeleteUserResult.NotFound;

            if (await _userRepository.HasTicketsAsync(id))
                return DeleteUserResult.HasRelatedData;

            var deleted = await _userRepository.DeleteAsync(id);
            return deleted ? DeleteUserResult.Deleted : DeleteUserResult.NotFound;
        }
    }
}
