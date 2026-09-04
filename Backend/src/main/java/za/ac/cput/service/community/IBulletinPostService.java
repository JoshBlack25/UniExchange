/*
 IBulletinPostService.java

 Service contract for BulletinPost.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.service.community;

import java.util.List;

import za.ac.cput.domain.community.BulletinPost;
import za.ac.cput.service.IService;

public interface IBulletinPostService extends IService<BulletinPost, Long> {

    List<BulletinPost> findByAuthorId(long authorId);

    List<BulletinPost> findAnnouncements();

}
